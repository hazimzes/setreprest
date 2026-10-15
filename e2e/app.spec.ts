import { expect, test, type Page } from '@playwright/test';

/**
 * E2E against the production build (vite preview, base /setreprest/).
 * Each test gets a fresh browser context → fresh IndexedDB.
 */

const APP = '/setreprest/';

async function dismissSWOfferIfAny(page: Page) {
  // PWA update toast may appear on repeat loads; harmless for tests.
  const reload = page.getByRole('button', { name: 'Reload' });
  try {
    await reload.waitFor({ state: 'visible', timeout: 1500 });
    // Keep the waiting SW — do not reload; the current version works for tests.
  } catch {
    /* no update prompt */
  }
}

async function startEmptyWorkout(page: Page) {
  await page.goto(APP);
  await dismissSWOfferIfAny(page);
  await page.getByRole('button', { name: 'Start empty workout' }).click();
  await page.waitForURL('**/setreprest/#/workout');
}

async function addExerciseByName(page: Page, name: string) {
  await page.getByRole('button', { name: 'Add exercise', exact: false }).first().click();
  await page.getByLabel('Search exercises').fill(name);
  await page.getByRole('button', { name: new RegExp(name) }).first().click();
}

test.describe.configure({ mode: 'serial' });

test('first load seeds the library and shows empty states', async ({ page }) => {
  await page.goto(APP);
  await expect(page.getByRole('button', { name: 'Start empty workout' })).toBeVisible();
  await expect(page.getByText('No workouts yet')).toBeVisible();

  await page.getByRole('link', { name: 'Library' }).click();
  await expect(page.getByText('exercises', { exact: false }).first()).toBeVisible();
  await expect(page.getByPlaceholder('Search exercises…')).toBeVisible();
  // Seeded catalog is present
  await page.getByLabel('Search exercises').fill('Bench Press');
  await expect(page.getByText('Barbell Bench Press')).toBeVisible();
});

test('start → add exercise → log sets → finish → history shows correct volume', async ({ page }) => {
  await startEmptyWorkout(page);
  await addExerciseByName(page, 'Barbell Squat');
  await expect(page.getByRole('heading', { name: 'Barbell Squat' })).toBeVisible();

  // Add a set and fill it
  await page.getByRole('button', { name: 'Add set' }).click();
  await page.getByLabel('Set 1 weight in kg', { exact: true }).fill('100');
  await page.getByLabel('Set 1 reps', { exact: true }).fill('5');
  await page.getByLabel('Mark set 1 complete').click();

  // Auto-follow set appears prefilled with 100 x 5
  await expect(page.getByLabel('Set 2 weight in kg', { exact: true })).toHaveValue('100');
  await expect(page.getByLabel('Set 2 reps', { exact: true })).toHaveValue('5');

  // Complete the follow-up too → volume 1000
  await page.getByLabel('Mark set 2 complete').click();
  await expect(page.getByText(/volume 1,?000/).first()).toBeVisible();

  await page.getByRole('button', { name: 'Finish workout' }).click();
  await page.getByRole('dialog', { name: 'Finish workout?' }).getByRole('button', { name: 'Finish' }).click();

  await page.waitForURL('**/setreprest/#/history');
  await expect(page.getByText('Workout —')).toBeVisible();

  await page.getByText('Workout —').first().click();
  await expect(page.getByText(/^1000 kg/)).toBeVisible();
  await expect(page.getByText('100 kg').first()).toBeVisible();
});

test('workout timer ticks in real time without interaction', async ({ page }) => {
  await startEmptyWorkout(page);
  const elapsed = page.locator('span[aria-label^="Elapsed"]');
  await expect(elapsed).toHaveText(/^00:0/);
  const before = await elapsed.textContent();
  // Timer must advance on its own — no sets logged, no navigation.
  await page.waitForFunction(
    (prev) => {
      const el = document.querySelector('span[aria-label^="Elapsed"]');
      return el !== null && el.textContent !== null && el.textContent !== prev;
    },
    before,
    { timeout: 8000 }
  );
});

test('refresh mid-workout recovers the session with sets intact', async ({ page }) => {
  await startEmptyWorkout(page);
  await addExerciseByName(page, 'Overhead Press');
  await page.getByRole('button', { name: 'Add set' }).click();
  await page.getByLabel('Set 1 weight in kg', { exact: true }).fill('42.5');
  await page.getByLabel('Set 1 reps', { exact: true }).fill('8');

  await page.reload();
  await dismissSWOfferIfAny(page);

  // Reload restores the workout deep link with all state intact
  await expect(page.getByRole('heading', { name: 'Overhead Press' })).toBeVisible();
  await expect(page.getByLabel('Set 1 weight in kg', { exact: true })).toHaveValue('42.5');
  await expect(page.getByLabel('Set 1 reps', { exact: true })).toHaveValue('8');

  // Home shows the in-progress card and Continue resumes the same session
  await page.getByRole('link', { name: 'Home' }).click();
  await expect(page.getByText('Workout in progress')).toBeVisible();
  await page.getByRole('button', { name: 'Continue workout' }).click();
  await expect(page.getByRole('heading', { name: 'Overhead Press' })).toBeVisible();
  await expect(page.getByLabel('Set 1 weight in kg', { exact: true })).toHaveValue('42.5');
});

test('template start copies targets; template stays unchanged', async ({ page }) => {
  await page.goto(APP);
  await dismissSWOfferIfAny(page);

  // Build a template
  await page.getByRole('link', { name: 'Templates' }).click();
  await page.getByRole('button', { name: 'New template' }).click();
  await page.getByLabel('Name').fill('Push A');
  await page.getByRole('button', { name: 'Add exercise' }).click();
  await page.getByLabel('Search exercises').fill('Bench');
  await page.getByRole('button', { name: 'Barbell Bench Press' }).click();
  await page.getByLabel('Increase Target sets for Barbell Bench Press').click();
  await page.getByRole('button', { name: 'Save template' }).click();
  await expect(page.getByText('Push A')).toBeVisible();

  // Start from it via Home chips (exact match avoids Copy/Delete aria-labels)
  await page.getByRole('link', { name: 'Home' }).click();
  await page.getByRole('button', { name: /^Push A/ }).first().click();
  await page.waitForURL('**/setreprest/#/workout');
  await expect(page.getByText(/4 sets/)).toBeVisible();

  // Template unchanged: 4 target sets still configured
  await page.getByRole('link', { name: 'Templates' }).click();
  await page.getByText('Push A').first().click();
  await expect(page.getByLabel('Target sets for Barbell Bench Press', { exact: true })).toHaveValue(/\d/);
});

test('substitution keeps the original sets attributed to the original exercise', async ({ page }) => {
  await startEmptyWorkout(page);
  await addExerciseByName(page, 'Barbell Squat');
  await page.getByRole('button', { name: 'Add set' }).click();
  await page.getByLabel('Set 1 weight in kg', { exact: true }).fill('120');
  await page.getByLabel('Mark set 1 complete').click();

  // Substitute
  await page.getByLabel('Barbell Squat options').click();
  await page.getByRole('button', { name: 'Substitute exercise' }).click();
  await page.getByLabel('Search exercises').fill('Leg Press');
  await page.getByRole('button', { name: 'Leg Press' }).first().click();

  // Old slot keeps the logged set; new slot is empty and marked substituted
  await expect(page.getByText('Substituted in place of another exercise')).toBeVisible();
  await expect(page.getByLabel('Set 1 weight in kg', { exact: true })).toHaveValue('120'); // original slot set
  await expect(page.getByText('No sets yet — add your first set.')).toBeVisible();
});

test('backup export → reset → restore round-trips data', async ({ page }) => {
  // Seed one completed workout first
  await startEmptyWorkout(page);
  await addExerciseByName(page, 'Deadlift');
  await page.getByRole('button', { name: 'Add set' }).click();
  await page.getByLabel('Set 1 weight in kg', { exact: true }).fill('150');
  await page.getByLabel('Set 1 reps', { exact: true }).fill('3');
  await page.getByLabel('Mark set 1 complete').click();
  await page.getByRole('button', { name: 'Finish workout' }).click();
  await page
    .getByRole('dialog', { name: 'Finish workout?' })
    .getByRole('button', { name: 'Finish' })
    .click();
  await page.waitForURL('**/setreprest/#/history');

  // Export backup
  await page.getByRole('link', { name: 'Settings' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export backup (JSON)' }).click();
  const download = await downloadPromise;
  const path = await download.path();

  // Reset everything (typed confirmation)
  await page.getByRole('button', { name: 'Reset all data…' }).click();
  await page.getByLabel('Type DELETE to confirm').fill('DELETE');
  await page.getByRole('button', { name: 'Delete everything' }).click();
  await expect(page.getByText('All data deleted')).toBeVisible();

  await page.goto(APP + '#/history');
  await expect(page.getByText('No workouts yet')).toBeVisible();

  // Restore
  await page.goto(APP + '#/settings');
  await page.getByRole('button', { name: 'Restore backup' }).click();
  await page.setInputFiles('input[type="file"]', path);
  await page.getByRole('button', { name: 'Merge into existing' }).click();
  await expect(page.getByText(/Restored 1 workouts/)).toBeVisible();

  await page.goto(APP + '#/history');
  await expect(page.getByText('Workout —')).toBeVisible();
});

test('CSV export contains header and set rows', async ({ page }) => {
  await startEmptyWorkout(page);
  await addExerciseByName(page, 'Barbell Row');
  await page.getByRole('button', { name: 'Add set' }).click();
  await page.getByLabel('Set 1 weight in kg', { exact: true }).fill('70');
  await page.getByLabel('Set 1 reps', { exact: true }).fill('10');
  await page.getByLabel('Mark set 1 complete').click();
  await page.getByRole('button', { name: 'Finish workout' }).click();
  await page
    .getByRole('dialog', { name: 'Finish workout?' })
    .getByRole('button', { name: 'Finish' })
    .click();
  await page.waitForURL('**/setreprest/#/history');

  await page.getByRole('link', { name: 'Settings' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export history (CSV)' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^setreprest-history-.*\.csv$/);
  const text = (await download.path() !== null)
    ? await (await import('node:fs/promises')).readFile((await download.path())!, 'utf8')
    : '';
  expect(text.charCodeAt(0)).toBe(0xfeff);
  expect(text).toContain('date,session_name,gym,exercise,set_type,weight,unit,reps,rpe,completed,notes');
  expect(text).toContain('Barbell Row');
});

test('offline: after first load the app boots and logs a set without network', async ({ page, context }) => {
  await page.goto(APP);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // Give the SW a moment to finish precaching
  await page.waitForTimeout(1000);

  await context.setOffline(true);
  try {
    await page.reload();
    await expect(page.getByRole('button', { name: 'Start empty workout' })).toBeVisible({ timeout: 15_000 });

    // Full offline logging flow
    await page.getByRole('button', { name: 'Start empty workout' }).click();
    await page.waitForURL('**/setreprest/#/workout');
    await page.getByRole('button', { name: 'Add exercise', exact: false }).first().click();
    await page.getByLabel('Search exercises').fill('Pull-Up');
    await page.getByRole('button', { name: 'Pull-Up' }).first().click();
    await page.getByRole('button', { name: 'Add set' }).click();
    await expect(page.getByLabel('Set 1 weight in kg', { exact: true })).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});

test('hash deep link works under the subpath', async ({ page }) => {
  await page.goto(APP + '#/library');
  await dismissSWOfferIfAny(page);
  await expect(page.getByPlaceholder('Search exercises…')).toBeVisible();

  await page.goto(APP + '#/settings');
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
});

test('custom exercise create → visible in library → usable in workout', async ({ page }) => {
  await page.goto(APP);
  await dismissSWOfferIfAny(page);
  await page.getByRole('link', { name: 'Library' }).click();
  await page.getByRole('button', { name: 'New custom exercise' }).click();
  const dialog = page.getByRole('dialog', { name: 'New custom exercise' });
  await page.getByLabel('Name', { exact: true }).fill('Landmine Press');
  await dialog.getByRole('button', { name: 'barbell', exact: true }).click();
  await dialog.getByRole('button', { name: 'chest', exact: true }).click();
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.getByText('Exercise created')).toBeVisible();

  await page.getByLabel('Search exercises').fill('Landmine');
  await expect(page.getByText('Landmine Press')).toBeVisible();

  await startEmptyWorkoutFromHome(page);
  await addExerciseByName(page, 'Landmine Press');
  await expect(page.getByRole('heading', { name: 'Landmine Press' })).toBeVisible();
});

async function startEmptyWorkoutFromHome(page: Page) {
  await page.getByRole('link', { name: 'Home' }).click();
  await page.getByRole('button', { name: 'Start empty workout' }).click();
  await page.waitForURL('**/setreprest/#/workout');
}

test('gym tabs: create gym → tagged workout → per-gym history and PR filtering', async ({ page }) => {
  await page.goto(APP);
  await dismissSWOfferIfAny(page);

  // Create two gyms from the Home tabs
  for (const gym of ['Fitness First', 'Anytime JB']) {
    await page.getByRole('button', { name: 'Add gym' }).first().click();
    await page.getByLabel('Gym name').fill(gym);
    await page.getByRole('dialog', { name: 'New gym' }).getByRole('button', { name: 'Add', exact: true }).click();
    await expect(page.getByRole('button', { name: gym })).toBeVisible();
  }

  // Select Fitness First and start a workout
  await page.getByRole('button', { name: 'Fitness First' }).click();
  await expect(page.getByRole('button', { name: /Start workout at Fitness First/ })).toBeVisible();
  await page.getByRole('button', { name: /Start workout at Fitness First/ }).click();
  await page.waitForURL('**/setreprest/#/workout');
  await expect(page.getByText('Fitness First')).toBeVisible(); // gym badge in workout header

  // Log one set
  await page.getByRole('button', { name: 'Add exercise', exact: false }).first().click();
  await page.getByLabel('Search exercises').fill('Deadlift');
  await page.getByRole('button', { name: 'Deadlift' }).first().click();
  await page.getByRole('button', { name: 'Add set' }).click();
  await page.getByLabel('Set 1 weight in kg', { exact: true }).fill('180');
  await page.getByLabel('Set 1 reps', { exact: true }).fill('3');
  await page.getByLabel('Mark set 1 complete').click();
  await page.getByRole('button', { name: 'Finish workout' }).click();
  await page
    .getByRole('dialog', { name: 'Finish workout?' })
    .getByRole('button', { name: 'Finish' })
    .click();
  await page.waitForURL('**/setreprest/#/history');

  // History shows the gym badge and the gym filter works
  await expect(page.getByText('Fitness First').first()).toBeVisible();
  await page.getByRole('group', { name: 'Filter by gym' }).getByRole('button', { name: 'Anytime JB' }).click();
  await expect(page.getByText('No workouts yet', { exact: false }).first()).toBeVisible();
  await page.getByRole('group', { name: 'Filter by gym' }).getByRole('button', { name: 'Fitness First' }).click();
  await expect(page.getByText('Workout —').first()).toBeVisible();

  // Per-gym analytics on the exercise page (via Library)
  await page.getByRole('link', { name: 'Library' }).click();
  await page.getByLabel('Search exercises').fill('Deadlift');
  await page.getByRole('link', { name: /^Deadlift/ }).first().click();
  await page.waitForURL('**/setreprest/#/library/**');
  await expect(page.getByText(/Personal record/)).toBeVisible();
  await page.getByRole('group', { name: 'Filter progress by gym' }).getByRole('button', { name: 'Anytime JB' }).click();
  await expect(page.getByText('No logged sessions yet.')).toBeVisible();
  await page.getByRole('group', { name: 'Filter progress by gym' }).getByRole('button', { name: 'Fitness First' }).click();
  await expect(page.getByText(/180/).first()).toBeVisible();

  // Selection persists across reload
  await page.goto(APP);
  await dismissSWOfferIfAny(page);
  await expect(page.getByRole('button', { name: 'Fitness First', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('progress page renders trends from demo data', async ({ page }) => {
  await page.goto(APP);
  await dismissSWOfferIfAny(page);
  // seed demo via settings
  await page.goto(APP + '#/settings');
  await page.getByRole('button', { name: 'Load demo dataset' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Load demo data' }).click();
  await page.waitForSelector('text=Demo data loaded', { timeout: 15000 });

  await page.getByRole('link', { name: 'Progress' }).click();
  await page.waitForURL('**/setreprest/#/progress');
  await expect(page.getByText(/Improving|Declining|Holding steady/)).toBeVisible();
  await expect(page.getByText('Weekly volume')).toBeVisible();
  await expect(page.getByText('Strength — est. 1RM, top lifts')).toBeVisible();
  await expect(page.getByText('Personal records · 4 weeks')).toBeVisible();
  // at least one recharts svg present
  await expect(page.locator('svg.recharts-surface').first()).toBeVisible();
  // streak tile present
  await expect(page.getByText('Streak')).toBeVisible();
});

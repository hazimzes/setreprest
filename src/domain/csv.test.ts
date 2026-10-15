import { describe, expect, it } from 'vitest';
import { buildHistoryCsv, buildSessionSummaryCsv } from './csv';
import { createId } from './id';
import type { Exercise, Session } from './models';

const exercises: Exercise[] = [
  {
    id: 'ex-1',
    name: 'Bench, Close Grip',
    muscleGroups: ['chest'],
    equipment: 'barbell',
    isCustom: false,
    isFavourite: false,
    createdAt: 0,
  },
];

function sessionWithNotes(notes: string | undefined): Session {
  return {
    id: createId(),
    name: 'Push "A" day, heavy',
    status: 'completed',
    startedAt: Date.UTC(2026, 0, 15, 18, 30),
    endedAt: Date.UTC(2026, 0, 15, 19, 30),
    accumulatedActiveMs: 3_600_000,
    paused: true,
    exercises: [
      {
        id: createId(),
        exerciseId: 'ex-1',
        order: 0,
        sets: [
          {
            id: createId(),
            type: 'working',
            weight: 82.5,
            reps: 5,
            completed: true,
            rpe: 8,
            ...(notes ? { notes } : {}),
          },
          {
            id: createId(),
            type: 'warmup',
            weight: 40,
            reps: 10,
            completed: true,
          },
        ],
      },
    ],
  };
}

describe('CSV export', () => {
  it('escapes commas, quotes and newlines; emits BOM and CRLF', () => {
    const tricky = sessionWithNotes('Felt "heavy", paused\nbelow knee');
    const csv = buildHistoryCsv([tricky], (id) => exercises.find((e) => e.id === id)?.name ?? '?', 'kg');
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const crlf = String.fromCharCode(13) + String.fromCharCode(10);
    expect(csv.includes(crlf)).toBe(true);
    const rows = csv.split('\r\n').filter((r) => r.length > 0);
    expect(rows[0]?.charCodeAt(0)).toBe(0xfeff);
    expect(rows[0]?.slice(1)).toBe(
      'date,session_name,gym,exercise,set_type,weight,unit,reps,rpe,completed,notes'
    );
    // Session name contains quotes + comma → quoted and doubled
    expect(rows.some((r) => r.includes('"Push ""A"" day, heavy"'))).toBe(true);
    // Notes with newline stay inside one quoted field → total rows: header + 2 sets
    expect(rows).toHaveLength(3);
    expect(rows[1]).toContain('"Felt ""heavy"", paused\nbelow knee"');
    expect(rows[2]).toContain('Warm-up');
  });

  it('summary csv lists one row per session', () => {
    const csv = buildSessionSummaryCsv([sessionWithNotes(undefined)]);
    const rows = csv.split('\r\n').filter((r) => r.length > 0);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.slice(1)).toBe('date,session_name,exercises,completed_sets,volume');
    expect(rows[1]).toContain('Push ""A"" day, heavy');
    expect(rows[1]).toContain('412.5'); // 82.5*5
  });
});

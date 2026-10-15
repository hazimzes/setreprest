import { useMemo } from 'react';
import type { Session, Units } from '../domain/models';
import { sessionVolume } from '../domain/calculations';
import { streakWeeks, weekDays } from '../domain/progress';

const WEEK_GOAL = 4;
const DAY = 24 * 3600 * 1000;

/**
 * "This week" strip: goal progress, Mon–Sun day dots (trained / today),
 * streak badge, weekly volume, all-time workout count. Respects the selected gym.
 */
export function ThisWeekCard({
  sessions,
  units,
}: {
  sessions: Session[];
  units: Units;
}) {
  const now = Date.now();

  const weekSessions = useMemo(() => {
    const start = weekDays(now)[0]!.date;
    return sessions.filter((s) => s.startedAt >= start && s.startedAt < start + 7 * DAY);
  }, [sessions, now]);

  const trainedDates = useMemo(
    () => new Set(weekSessions.map((s) => new Date(s.startedAt).setHours(0, 0, 0, 0))),
    [weekSessions]
  );

  const days = weekDays(now);
  const volume = weekSessions.reduce((sum, s) => sum + sessionVolume(s), 0);
  const streak = useMemo(() => streakWeeks(sessions, now), [sessions, now]);
  const progress = Math.min(1, weekSessions.length / WEEK_GOAL);

  return (
    <section className="rounded-[10px] border border-line bg-surface p-4" aria-label="This week">
      <div className="flex items-center justify-between">
        <h2 className="microlabel">This week</h2>
        <span className="tnum flex items-center gap-1 rounded-full bg-raised px-2 py-0.5 text-[11px] text-secondary">
          <svg width="10" height="12" viewBox="0 0 10 12" fill="var(--app-accent)" aria-hidden="true">
            <path d="M5 0C6.5 2 9 3.5 9 7a4 4 0 11-8 0C1 5 2.5 3.5 3 2c.8.8 1.4 1.6 1.6 2.6C5.4 3.4 5.2 1.6 5 0z" />
          </svg>
          {streak} wk streak
        </span>
      </div>

      <p className="tnum mt-1.5 text-[22px] font-semibold leading-none tracking-tight">
        {weekSessions.length}
        <span className="text-base font-medium text-secondary"> / {WEEK_GOAL} workouts</span>
      </p>

      <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-raised" role="progressbar" aria-valuenow={weekSessions.length} aria-valuemin={0} aria-valuemax={WEEK_GOAL} aria-label="Weekly goal progress">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-300"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>

      <div className="mt-3.5 grid grid-cols-7 gap-1.5">
        {days.map((day) => {
          const trained = trainedDates.has(day.date);
          return (
            <div key={day.date} className="flex flex-col items-center gap-1">
              <div
                className={`tnum flex h-9 w-9 items-center justify-center rounded-full border text-[13px] font-medium ${
                  trained
                    ? 'border-accent bg-accent text-accent-ink'
                    : day.isToday
                      ? 'border-accent bg-surface text-fg'
                      : 'border-line bg-raised ' + (day.isPast ? 'text-secondary' : 'text-muted')
                }`}
                aria-current={day.isToday ? 'date' : undefined}
                aria-label={`${day.dayOfMonth} ${day.letter}${trained ? ', trained' : day.isToday ? ', today' : ''}`}
              >
                {day.dayOfMonth}
              </div>
              <span className={`text-[10px] ${day.isToday ? 'font-semibold text-fg' : 'text-muted'}`}>
                {day.letter}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-3.5 flex border-t border-line pt-3">
        <div className="flex-1">
          <p className="microlabel">Volume this week</p>
          <p className="tnum mt-0.5 text-sm font-semibold">
            {Math.round(volume * 10) / 10} <span className="text-xs font-normal text-secondary">{units}</span>
          </p>
        </div>
        <div className="flex-1">
          <p className="microlabel">Total workouts</p>
          <p className="tnum mt-0.5 text-sm font-semibold">{sessions.length}</p>
        </div>
      </div>
    </section>
  );
}

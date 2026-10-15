import { sessionVolume } from './calculations';
import { setTypeLabel } from './validation';
import type { Session, Units } from './models';

export const CSV_HEADERS = [
  'date',
  'session_name',
  'exercise',
  'set_type',
  'weight',
  'unit',
  'reps',
  'rpe',
  'completed',
  'notes',
] as const;

/** UTF-8 BOM so Excel opens the file with correct encoding. */
const BOM = '﻿';

function escapeCsvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

export function sessionToCsvRows(
  session: Session,
  exerciseName: (id: string) => string,
  units: Units
): string[][] {
  const rows: string[][] = [];
  for (const ex of session.exercises) {
    const name = exerciseName(ex.exerciseId);
    for (const set of ex.sets) {
      rows.push([
        new Date(session.startedAt).toISOString(),
        session.name,
        name,
        setTypeLabel(set.type),
        String(set.weight),
        units,
        String(set.reps),
        set.rpe !== undefined ? String(set.rpe) : '',
        set.completed ? 'yes' : 'no',
        set.notes ?? '',
      ]);
    }
  }
  return rows;
}

/** Full history CSV: UTF-8 BOM, CRLF, RFC 4180 quoting. */
export function buildHistoryCsv(
  sessions: Session[],
  exerciseName: (id: string) => string,
  units: Units
): string {
  const lines: string[] = [CSV_HEADERS.join(',')];
  const ordered = [...sessions].sort((a, b) => b.startedAt - a.startedAt);
  for (const session of ordered) {
    for (const row of sessionToCsvRows(session, exerciseName, units)) {
      lines.push(row.map(escapeCsvField).join(','));
    }
  }
  return BOM + lines.join('\r\n') + '\r\n';
}

/** One row per session summary — used for a compact overview export. */
export function buildSessionSummaryCsv(sessions: Session[]): string {
  const headers = ['date', 'session_name', 'exercises', 'completed_sets', 'volume'];
  const lines = [headers.join(',')];
  const ordered = [...sessions].sort((a, b) => b.startedAt - a.startedAt);
  for (const session of ordered) {
    lines.push(
      [
        new Date(session.startedAt).toISOString(),
        session.name,
        String(session.exercises.length),
        String(session.exercises.reduce((n, ex) => n + ex.sets.filter((s) => s.completed).length, 0)),
        String(Math.round(sessionVolume(session) * 10) / 10),
      ]
        .map(escapeCsvField)
        .join(',')
    );
  }
  return BOM + lines.join('\r\n') + '\r\n';
}

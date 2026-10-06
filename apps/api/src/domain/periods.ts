export type PeriodPreset = 'today' | '7d' | '30d' | 'month' | 'previous_month' | 'year';

export type DateRange = { from: Date; to: Date; previousFrom: Date; previousTo: Date };
export type LocalDate = { year: number; month: number; day: number };

function localDate(date: Date, timezone: string): LocalDate {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { year: Number(values.year), month: Number(values.month), day: Number(values.day) };
}

function zonedStart(date: LocalDate, timezone: string): Date {
  const calendarUtc = Date.UTC(date.year, date.month - 1, date.day);
  let guess = new Date(calendarUtc);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const zoneName =
      new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        timeZoneName: 'shortOffset',
      })
        .formatToParts(guess)
        .find((part) => part.type === 'timeZoneName')?.value ?? 'GMT';
    const match = zoneName.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
    if (!match) return guess;
    const offsetMinutes =
      (Number(match[2]) * 60 + Number(match[3] ?? 0)) * (match[1] === '+' ? 1 : -1);
    guess = new Date(calendarUtc - offsetMinutes * 60_000);
  }
  return guess;
}

export function addCalendarDays(date: Date, days: number, timezone: string): Date {
  const current = localDate(date, timezone);
  const shifted = new Date(Date.UTC(current.year, current.month - 1, current.day + days));
  return zonedStart(
    { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() },
    timezone,
  );
}

function comparePeriod(
  preset: PeriodPreset,
  from: Date,
  timezone: string,
): { previousFrom: Date; previousTo: Date } {
  const current = localDate(from, timezone);
  if (preset === 'year') {
    return {
      previousFrom: zonedStart({ year: current.year - 1, month: 1, day: 1 }, timezone),
      previousTo: from,
    };
  }
  if (preset === 'month' || preset === 'previous_month') {
    const previousMonth = new Date(Date.UTC(current.year, current.month - 2, 1));
    const previousStart = zonedStart(
      { year: previousMonth.getUTCFullYear(), month: previousMonth.getUTCMonth() + 1, day: 1 },
      timezone,
    );
    const previousPrevious = new Date(
      Date.UTC(previousMonth.getUTCFullYear(), previousMonth.getUTCMonth() - 1, 1),
    );
    return {
      previousFrom:
        preset === 'month'
          ? previousStart
          : zonedStart(
              {
                year: previousPrevious.getUTCFullYear(),
                month: previousPrevious.getUTCMonth() + 1,
                day: 1,
              },
              timezone,
            ),
      previousTo: from,
    };
  }
  const days = preset === 'today' ? 1 : preset === '7d' ? 7 : 30;
  return { previousFrom: addCalendarDays(from, -days, timezone), previousTo: from };
}

export function resolvePeriod(
  preset: PeriodPreset = 'month',
  timezone = 'America/Sao_Paulo',
  now = new Date(),
): DateRange {
  const current = localDate(now, timezone);
  const today = zonedStart(current, timezone);
  let from: Date;
  let to: Date;
  if (preset === 'today') {
    from = today;
    to = addCalendarDays(today, 1, timezone);
  } else if (preset === '7d' || preset === '30d') {
    const days = preset === '7d' ? 7 : 30;
    to = addCalendarDays(today, 1, timezone);
    from = addCalendarDays(to, -days, timezone);
  } else if (preset === 'year') {
    from = zonedStart({ year: current.year, month: 1, day: 1 }, timezone);
    to = zonedStart({ year: current.year + 1, month: 1, day: 1 }, timezone);
  } else if (preset === 'previous_month') {
    from = zonedStart(
      {
        year: current.month === 1 ? current.year - 1 : current.year,
        month: current.month === 1 ? 12 : current.month - 1,
        day: 1,
      },
      timezone,
    );
    to = zonedStart({ year: current.year, month: current.month, day: 1 }, timezone);
  } else {
    from = zonedStart({ year: current.year, month: current.month, day: 1 }, timezone);
    to = zonedStart(
      {
        year: current.month === 12 ? current.year + 1 : current.year,
        month: current.month === 12 ? 1 : current.month + 1,
        day: 1,
      },
      timezone,
    );
  }
  const comparison = comparePeriod(preset, from, timezone);
  return { from, to, previousFrom: comparison.previousFrom, previousTo: comparison.previousTo };
}

export function localDateKey(date: Date, timezone: string): string {
  const value = localDate(date, timezone);
  return `${value.year.toString().padStart(4, '0')}-${value.month
    .toString()
    .padStart(2, '0')}-${value.day.toString().padStart(2, '0')}`;
}

export function localTodayDateOnly(timezone: string, now = new Date()): Date {
  const value = localDate(now, timezone);
  return new Date(Date.UTC(value.year, value.month - 1, value.day));
}

export function isOverdue(
  status: string,
  dueDate: Date | null,
  timezone: string,
  now = new Date(),
): boolean {
  if (status !== 'PENDING' || !dueDate) return false;
  const today = localDateKey(now, timezone);
  const due = `${dueDate.getUTCFullYear().toString().padStart(4, '0')}-${(dueDate.getUTCMonth() + 1)
    .toString()
    .padStart(2, '0')}-${dueDate.getUTCDate().toString().padStart(2, '0')}`;
  return due < today;
}

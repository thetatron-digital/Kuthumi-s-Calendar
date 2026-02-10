// ============================================================
// Holidays & Calendar Events Engine
// US Federal Holidays, Notable Dates, Seasonal Markers
// ============================================================

export interface CalendarEvent {
  name: string;
  type: 'federal' | 'notable' | 'seasonal' | 'awareness';
  emoji: string;
}

// --- Fixed-date holidays (month is 1-indexed) ---
const FIXED_HOLIDAYS: { month: number; day: number; event: CalendarEvent }[] = [
  { month: 1, day: 1, event: { name: "New Year's Day", type: 'federal', emoji: '🎆' } },
  { month: 2, day: 2, event: { name: 'Groundhog Day', type: 'notable', emoji: '🦫' } },
  { month: 2, day: 14, event: { name: "Valentine's Day", type: 'notable', emoji: '❤️' } },
  { month: 3, day: 17, event: { name: "St. Patrick's Day", type: 'notable', emoji: '☘️' } },
  { month: 4, day: 1, event: { name: "April Fools' Day", type: 'notable', emoji: '🃏' } },
  { month: 4, day: 22, event: { name: 'Earth Day', type: 'awareness', emoji: '🌍' } },
  { month: 5, day: 5, event: { name: 'Cinco de Mayo', type: 'notable', emoji: '🇲🇽' } },
  { month: 6, day: 14, event: { name: 'Flag Day', type: 'notable', emoji: '🇺🇸' } },
  { month: 6, day: 19, event: { name: 'Juneteenth', type: 'federal', emoji: '✊' } },
  { month: 7, day: 4, event: { name: 'Independence Day', type: 'federal', emoji: '🇺🇸' } },
  { month: 9, day: 11, event: { name: 'Patriot Day', type: 'notable', emoji: '🕊️' } },
  { month: 10, day: 31, event: { name: 'Halloween', type: 'notable', emoji: '🎃' } },
  { month: 11, day: 11, event: { name: 'Veterans Day', type: 'federal', emoji: '🎖️' } },
  { month: 12, day: 24, event: { name: 'Christmas Eve', type: 'notable', emoji: '🎄' } },
  { month: 12, day: 25, event: { name: 'Christmas Day', type: 'federal', emoji: '🎄' } },
  { month: 12, day: 31, event: { name: "New Year's Eve", type: 'notable', emoji: '🥂' } },
];

// --- Nth weekday of month holidays ---
// weekday: 0=Sunday, 1=Monday, ...
function getNthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): Date {
  const first = new Date(year, month - 1, 1);
  const firstWeekday = first.getDay();
  let day = 1 + ((weekday - firstWeekday + 7) % 7) + (n - 1) * 7;
  return new Date(year, month - 1, day);
}

function getLastWeekdayOfMonth(year: number, month: number, weekday: number): Date {
  const lastDay = new Date(year, month, 0); // last day of month
  const lastWeekday = lastDay.getDay();
  const diff = (lastWeekday - weekday + 7) % 7;
  return new Date(year, month - 1, lastDay.getDate() - diff);
}

// Martin Luther King Jr. Day: 3rd Monday of January
function getMLKDay(year: number): Date {
  return getNthWeekdayOfMonth(year, 1, 1, 3);
}

// Presidents' Day: 3rd Monday of February
function getPresidentsDay(year: number): Date {
  return getNthWeekdayOfMonth(year, 2, 1, 3);
}

// Mother's Day: 2nd Sunday of May
function getMothersDay(year: number): Date {
  return getNthWeekdayOfMonth(year, 5, 0, 2);
}

// Memorial Day: Last Monday of May
function getMemorialDay(year: number): Date {
  return getLastWeekdayOfMonth(year, 5, 1);
}

// Father's Day: 3rd Sunday of June
function getFathersDay(year: number): Date {
  return getNthWeekdayOfMonth(year, 6, 0, 3);
}

// Labor Day: 1st Monday of September
function getLaborDay(year: number): Date {
  return getNthWeekdayOfMonth(year, 9, 1, 1);
}

// Columbus Day / Indigenous Peoples' Day: 2nd Monday of October
function getColumbusDay(year: number): Date {
  return getNthWeekdayOfMonth(year, 10, 1, 2);
}

// Thanksgiving: 4th Thursday of November
function getThanksgiving(year: number): Date {
  return getNthWeekdayOfMonth(year, 11, 4, 4);
}

// Black Friday: day after Thanksgiving
function getBlackFriday(year: number): Date {
  const tg = getThanksgiving(year);
  return new Date(tg.getFullYear(), tg.getMonth(), tg.getDate() + 1);
}

// Easter (Computus algorithm)
function getEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

// Daylight Saving Time (US): 2nd Sunday of March (spring forward)
function getDSTStart(year: number): Date {
  return getNthWeekdayOfMonth(year, 3, 0, 2);
}

// DST End: 1st Sunday of November (fall back)
function getDSTEnd(year: number): Date {
  return getNthWeekdayOfMonth(year, 11, 0, 1);
}

// Election Day: 1st Tuesday after the 1st Monday of November (even years)
function getElectionDay(year: number): Date | null {
  if (year % 2 !== 0) return null;
  const firstMonday = getNthWeekdayOfMonth(year, 11, 1, 1);
  return new Date(firstMonday.getFullYear(), firstMonday.getMonth(), firstMonday.getDate() + 1);
}

// Seasonal markers (approximate)
function getSeasonalDates(year: number): { date: Date; event: CalendarEvent }[] {
  return [
    { date: new Date(year, 2, 20), event: { name: 'Spring Equinox', type: 'seasonal', emoji: '🌱' } },
    { date: new Date(year, 5, 20), event: { name: 'Summer Solstice', type: 'seasonal', emoji: '☀️' } },
    { date: new Date(year, 8, 22), event: { name: 'Autumn Equinox', type: 'seasonal', emoji: '🍂' } },
    { date: new Date(year, 11, 21), event: { name: 'Winter Solstice', type: 'seasonal', emoji: '❄️' } },
  ];
}

function dateToISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Build a map of ISO date -> CalendarEvent[] for a given year
function buildYearCalendar(year: number): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>();

  function add(d: Date | null, event: CalendarEvent) {
    if (!d) return;
    const key = dateToISO(d);
    const existing = map.get(key) || [];
    existing.push(event);
    map.set(key, existing);
  }

  // Fixed-date holidays
  for (const { month, day, event } of FIXED_HOLIDAYS) {
    add(new Date(year, month - 1, day), event);
  }

  // Floating holidays
  add(getMLKDay(year), { name: 'Martin Luther King Jr. Day', type: 'federal', emoji: '✊' });
  add(getPresidentsDay(year), { name: "Presidents' Day", type: 'federal', emoji: '🏛️' });
  add(getMothersDay(year), { name: "Mother's Day", type: 'notable', emoji: '💐' });
  add(getMemorialDay(year), { name: 'Memorial Day', type: 'federal', emoji: '🇺🇸' });
  add(getFathersDay(year), { name: "Father's Day", type: 'notable', emoji: '👔' });
  add(getLaborDay(year), { name: 'Labor Day', type: 'federal', emoji: '⚒️' });
  add(getColumbusDay(year), { name: 'Indigenous Peoples\' Day', type: 'federal', emoji: '🌎' });
  add(getThanksgiving(year), { name: 'Thanksgiving', type: 'federal', emoji: '🦃' });
  add(getBlackFriday(year), { name: 'Black Friday', type: 'notable', emoji: '🛍️' });

  // Easter
  const easter = getEaster(year);
  add(easter, { name: 'Easter Sunday', type: 'notable', emoji: '🐣' });

  // DST
  add(getDSTStart(year), { name: 'Daylight Saving Time Begins', type: 'seasonal', emoji: '🕐' });
  add(getDSTEnd(year), { name: 'Daylight Saving Time Ends', type: 'seasonal', emoji: '🕐' });

  // Election Day
  add(getElectionDay(year), { name: 'Election Day', type: 'notable', emoji: '🗳️' });

  // Seasonal
  for (const { date, event } of getSeasonalDates(year)) {
    add(date, event);
  }

  return map;
}

// Cache by year
const cache = new Map<number, Map<string, CalendarEvent[]>>();

function getYearCalendar(year: number): Map<string, CalendarEvent[]> {
  if (!cache.has(year)) {
    cache.set(year, buildYearCalendar(year));
  }
  return cache.get(year)!;
}

// --- Public API ---

/** Get all calendar events for a specific ISO date string (YYYY-MM-DD) */
export function getHolidaysForDate(dateISO: string): CalendarEvent[] {
  const year = parseInt(dateISO.slice(0, 4), 10);
  const cal = getYearCalendar(year);
  return cal.get(dateISO) || [];
}

/** Get all calendar events for a specific Date object */
export function getHolidaysForDateObj(date: Date): CalendarEvent[] {
  return getHolidaysForDate(dateToISO(date));
}

/** Check if a date is a federal holiday */
export function isFederalHoliday(dateISO: string): boolean {
  return getHolidaysForDate(dateISO).some(e => e.type === 'federal');
}

/** Get upcoming holidays within the next N days from today */
export function getUpcomingHolidays(days: number = 14): { date: string; events: CalendarEvent[] }[] {
  const today = new Date();
  const results: { date: string; events: CalendarEvent[] }[] = [];

  for (let i = 0; i <= days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const iso = dateToISO(d);
    const events = getHolidaysForDate(iso);
    if (events.length > 0) {
      results.push({ date: iso, events });
    }
  }

  return results;
}

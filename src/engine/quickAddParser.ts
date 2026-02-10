// ============================================================
// Quick Add Parser
// Parses natural language task input into structured task data
// ============================================================

import type { ParsedQuickAdd, TaskCategory, WorkType, Priority, Deadline, DeadlineType } from '../types';

// --- Category Keywords ---
const CATEGORY_KEYWORDS: { pattern: RegExp; category: TaskCategory; workType: WorkType }[] = [
  { pattern: /\b(documentary|ironmouse|doc)\b.*\b(writ|script|act\b)/i, category: 'documentary_writing', workType: 'deep_focus' },
  { pattern: /\b(documentary|ironmouse|doc)\b.*\b(edit|clip|cut|organiz)/i, category: 'documentary_editing', workType: 'deep_focus' },
  { pattern: /\b(documentary|ironmouse|doc)\b.*\b(research|audio|hunt|find)/i, category: 'documentary_research', workType: 'moderate_focus' },
  { pattern: /\b(livestream|stream)\b.*\b(edit|vertical|reformat|clip)/i, category: 'livestream_editing', workType: 'moderate_focus' },
  { pattern: /\b(livestream|stream)\b.*\b(upload|publish|post)/i, category: 'livestream_publishing', workType: 'light' },
  { pattern: /\b(virtual\s*production|vp)\b.*\b(plan|coordinat|direct|call)/i, category: 'virtual_production_planning', workType: 'phone_only' },
  { pattern: /\b(virtual\s*production|vp)\b.*\b(creativ|design|concept)/i, category: 'virtual_production_creative', workType: 'deep_focus' },
  { pattern: /\b(network|outreach|connect|collab)/i, category: 'networking', workType: 'phone_only' },
  { pattern: /\b(call|phone|ring|dial|zoom|meet)/i, category: 'phone_call', workType: 'phone_only' },
  { pattern: /\b(admin|tax|deed|name\s*change|paperwork|document|dmv|insurance|legal)/i, category: 'admin', workType: 'admin' },
  { pattern: /\b(edit|clip|cut)\b/i, category: 'livestream_editing', workType: 'moderate_focus' },
  { pattern: /\b(writ|script)\b/i, category: 'documentary_writing', workType: 'deep_focus' },
];

// --- Priority Keywords ---
const PRIORITY_PATTERNS: { pattern: RegExp; priority: Priority }[] = [
  { pattern: /\b(urgent|asap|critical|immediately|now)\b/i, priority: 'high' },
  { pattern: /\b(important|high\s*priority|need\s*to)\b/i, priority: 'high' },
  { pattern: /\b(whenever|no\s*rush|low\s*priority|someday|eventually)\b/i, priority: 'low' },
];

// --- Deadline Patterns ---
const DEADLINE_PATTERNS: { pattern: RegExp; type: DeadlineType; extractDate?: (match: RegExpMatchArray) => string | undefined }[] = [
  { pattern: /\basap\b/i, type: 'asap' },
  { pattern: /\b(this\s*week|by\s*(end\s*of\s*)?week)\b/i, type: 'this_week' },
  { pattern: /\bwhenever\b/i, type: 'whenever' },
  { pattern: /\bno\s*(deadline|rush|date)\b/i, type: 'none' },
  {
    pattern: /\b(?:by|due|before|until)\s+(\w+\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*,?\s*\d{4})?)\b/i,
    type: 'specific_date',
    extractDate: (match) => {
      try {
        const dateStr = match[1];
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
      } catch { /* ignore */ }
      return undefined;
    },
  },
  {
    pattern: /\b(?:by|due|before|until)\s+(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\b/i,
    type: 'specific_date',
    extractDate: (match) => {
      try {
        const parsed = new Date(match[1]);
        if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
      } catch { /* ignore */ }
      return undefined;
    },
  },
  {
    pattern: /\bend\s*of\s*(month|january|february|march|april|may|june|july|august|september|october|november|december)\b/i,
    type: 'specific_date',
    extractDate: (match) => {
      const monthNames: Record<string, number> = {
        january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
        july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
      };
      const target = match[1].toLowerCase();
      const now = new Date();
      if (target === 'month') {
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return lastDay.toISOString().split('T')[0];
      }
      const monthIndex = monthNames[target];
      if (monthIndex !== undefined) {
        let year = now.getFullYear();
        if (monthIndex < now.getMonth()) year++;
        const lastDay = new Date(year, monthIndex + 1, 0);
        return lastDay.toISOString().split('T')[0];
      }
      return undefined;
    },
  },
];

// --- Backlog Keywords ---
const BACKLOG_PATTERN = /\b(whenever|someday|no\s*rush|backlog|long[\s-]*term)\b/i;

// --- Phone Keywords ---
const PHONE_PATTERN = /\b(call|phone|ring|dial|zoom|meet|voice|speak\s*(?:with|to))\b/i;

// --- Main Parser ---
export function parseQuickAdd(input: string, projects?: { id: string; name: string }[]): ParsedQuickAdd {
  const trimmed = input.trim();

  // Detect category
  let category: TaskCategory = 'other';
  let workType: WorkType = 'light';
  for (const { pattern, category: cat, workType: wt } of CATEGORY_KEYWORDS) {
    if (pattern.test(trimmed)) {
      category = cat;
      workType = wt;
      break;
    }
  }

  // Detect priority
  let priority: Priority = 'medium';
  for (const { pattern, priority: p } of PRIORITY_PATTERNS) {
    if (pattern.test(trimmed)) {
      priority = p;
      break;
    }
  }

  // Detect deadline
  let deadline: Deadline = { type: 'none' };
  for (const { pattern, type, extractDate } of DEADLINE_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      deadline = { type, date: extractDate?.(match) };
      break;
    }
  }

  // Detect if backlog
  const isBacklog = category === 'admin' && BACKLOG_PATTERN.test(trimmed);

  // Detect phone task
  const isPhoneTask = PHONE_PATTERN.test(trimmed) || workType === 'phone_only';

  // Try to match project
  let projectId: string | undefined;
  if (projects) {
    for (const project of projects) {
      if (trimmed.toLowerCase().includes(project.name.toLowerCase())) {
        projectId = project.id;
        break;
      }
    }
  }

  // Clean title - remove deadline/priority markers
  let title = trimmed
    .replace(/,?\s*(asap|whenever|no\s*(deadline|rush|date)|by\s+\S+(\s+\S+)?|due\s+\S+(\s+\S+)?|high\s*priority|low\s*priority|urgent|no\s*rush)/gi, '')
    .replace(/,\s*$/, '')
    .trim();

  // Capitalize first letter
  if (title.length > 0) {
    title = title.charAt(0).toUpperCase() + title.slice(1);
  }

  return {
    title: title || trimmed,
    category,
    workType,
    priority,
    deadline,
    isPhoneTask,
    isBacklog,
    projectId,
  };
}

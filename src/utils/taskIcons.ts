// ============================================================
// Task Icon & Color Mapping
// Maps TaskCategory to emoji icons and default colors
// ============================================================

import type { TaskCategory } from '../types';

export const CATEGORY_ICONS: Record<TaskCategory, string> = {
  documentary_writing: '\u270D\uFE0F',
  documentary_editing: '\uD83C\uDFAC',
  documentary_research: '\uD83D\uDD0D',
  livestream_editing: '\uD83D\uDCFA',
  livestream_publishing: '\uD83D\uDCE4',
  virtual_production_planning: '\uD83C\uDFAF',
  virtual_production_creative: '\uD83C\uDFA8',
  networking: '\uD83E\uDD1D',
  admin: '\uD83D\uDCCB',
  phone_call: '\uD83D\uDCDE',
  other: '\uD83D\uDCCC',
};

export const CATEGORY_COLORS: Record<TaskCategory, string> = {
  documentary_writing: '#3b82f6',
  documentary_editing: '#6366f1',
  documentary_research: '#8b5cf6',
  livestream_editing: '#a855f7',
  livestream_publishing: '#c084fc',
  virtual_production_planning: '#06b6d4',
  virtual_production_creative: '#14b8a6',
  networking: '#22c55e',
  admin: '#f59e0b',
  phone_call: '#f97316',
  other: '#a3a3a3',
};

export function getTaskIcon(category: TaskCategory): string {
  return CATEGORY_ICONS[category] || '\uD83D\uDCCC';
}

export function getTaskColor(category: TaskCategory, customColor?: string): string {
  return customColor || CATEGORY_COLORS[category] || '#a3a3a3';
}

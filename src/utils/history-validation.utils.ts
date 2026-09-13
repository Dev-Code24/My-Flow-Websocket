import { HistoryElementState, HistoryEntryDraft } from '../@interfaces';

export function isHistoryEntryDraft(value: unknown): value is HistoryEntryDraft {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const entry = value as Record<string, unknown>;

  if (typeof entry.entryId !== 'string' || entry.entryId.length === 0) {
    return false;
  }

  if (!Array.isArray(entry.changes) || entry.changes.length === 0) {
    return false;
  }

  const seenElementIds = new Set<string>();

  for (const changeValue of entry.changes) {
    if (!changeValue || typeof changeValue !== 'object') {
      return false;
    }

    const change = changeValue as Record<string, unknown>;

    if (
      typeof change.elementId !== 'string' ||
      change.elementId.length === 0 ||
      seenElementIds.has(change.elementId)
    ) {
      return false;
    }

    seenElementIds.add(change.elementId);

    const before = change.before;
    const after = change.after;

    if ( before === null && after === null) {
      return false;
    }

    if ( before !== null && !isHistoryElementState(before, change.elementId) ) {
      return false;
    }

    if ( after !== null && !isHistoryElementState(after, change.elementId)) {
      return false;
    }
  }

  return true;
}

function isHistoryElementState(
  value: unknown,
  elementId: string,
): value is HistoryElementState {
  if ( !value || typeof value !== 'object') {
    return false;
  }

  const state = value as Record<string, unknown>;

  if (!Number.isInteger(state.index) || Number(state.index) < 0) {
    return false;
  }

  if (!state.element || typeof state.element !== 'object') {
    return false;
  }

  const element = state.element as Record<string, unknown>;

  return element.id === elementId;
}
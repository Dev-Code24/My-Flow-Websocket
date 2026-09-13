export interface HistoryElement {
  id: string;
  [key: string]: unknown;
}

export interface HistoryElementState {
  element: HistoryElement;
  index: number;
}

export interface HistoryElementChange {
  elementId: string;
  before: HistoryElementState | null;
  after: HistoryElementState | null;
}

export interface HistoryEntryDraft {
  entryId: string;
  changes: HistoryElementChange[];
}

export interface CollaborationHistoryEntry
  extends HistoryEntryDraft {
  actorParticipantId: string;
  createdAt: number;
}

export interface RoomHistoryState {
  cursor: number;
  historyVersion: number;
  historyLength: number;
  canUndo: boolean;
  canRedo: boolean;
}

export interface AppendHistoryEntryResult {
  appended: boolean;
  state: RoomHistoryState;
}
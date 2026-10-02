export interface HistoryElement {
  id: string;
  [key: string]: unknown;
}

export interface HistoryElementState {
  element: HistoryElement;
  index: number;
  orderContext: {
    previousElementId: string | null;
    nextElementId: string | null;
  };
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

export type CommitUndoResult =
| {
  status: 'committed';
  state: RoomHistoryState;
  streamId: string;
} | {
  status: 'already_committed';
  state: RoomHistoryState;
  streamId: string;
} | {
  status: 'stale';
  state: RoomHistoryState;
} | {
  status: 'nothing_to_undo';
  state: RoomHistoryState;
}  | {
  status: 'edit_conflict';
  state: RoomHistoryState;
};

export type CommitRedoResult =
  | {
  status: 'committed';
  state: RoomHistoryState;
  streamId: string;
}
  | {
  status: 'already_committed';
  state: RoomHistoryState;
  streamId: string;
}
  | {
  status: 'stale';
  state: RoomHistoryState;
}
  | {
  status: 'nothing_to_redo';
  state: RoomHistoryState;
}
  | {
  status: 'edit_conflict';
  state: RoomHistoryState;
};

export type ExecuteUndoResult =
  | {
    status: 'committed' | 'already_committed';
    state: RoomHistoryState;
    update: string;
    updateId: string;
  } | {
    status: 'stale' | 'nothing_to_undo' | 'edit_conflict';
    state: RoomHistoryState;
  };

export type ExecuteRedoResult =
  | {
  status: 'committed' | 'already_committed';
  state: RoomHistoryState;
  update: string;
  updateId: string;
} | {
  status: 'stale' | 'nothing_to_redo' | 'edit_conflict';
  state: RoomHistoryState;
};
import {
  AppendHistoryEntryResult,
  CollaborationHistoryEntry,
  ExecuteRedoResult,
  ExecuteUndoResult,
  HistoryEntryDraft,
  RoomHistoryState,
} from '../interfaces';
import { HISTORY_REPOSITORY } from '../repository';
import { YJS_SERVICE } from "./yjs.services";

export interface UndoHistoryTarget {
  state: RoomHistoryState;
  entry: CollaborationHistoryEntry;
}

export interface RedoHistoryTarget {
  state: RoomHistoryState;
  entry: CollaborationHistoryEntry;
}

export class HistoryService {
  public async commitEntry(
    roomId: string,
    actorParticipantId: string,
    draft: HistoryEntryDraft,
  ): Promise<AppendHistoryEntryResult> {
    const entry: CollaborationHistoryEntry = {
      entryId: draft.entryId,
      actorParticipantId,
      changes: draft.changes,
      createdAt: Date.now(),
    };

    return HISTORY_REPOSITORY.append(roomId, entry);
  }

  public async getRoomState(roomId: string): Promise<RoomHistoryState> {
    return HISTORY_REPOSITORY.getState(roomId);
  }

  public async getUndoTarget(roomId: string): Promise<UndoHistoryTarget | null> {
    const state = await HISTORY_REPOSITORY.getState(roomId);

    if (!state.canUndo) {
      return null;
    }

    const entryIndex = state.cursor - 1;

    const entry = await HISTORY_REPOSITORY.getEntry(roomId, entryIndex);

    if (!entry) {
      throw new Error(`Missing history entry at index ${entryIndex} for room ${roomId}`);
    }

    return {
      state,
      entry,
    };
  }

  public async undo(
    roomId: string,
    expectedVersion: number,
  ): Promise<ExecuteUndoResult> {
    const undoTarget = await this.getUndoTarget(roomId);

    if (!undoTarget) {
      const state = await HISTORY_REPOSITORY.getState(roomId);

      return {
        status: 'nothing_to_undo',
        state,
      };
    }

    if (undoTarget.state.historyVersion !== expectedVersion) {
      return {
        status: 'stale',
        state: undoTarget.state,
      };
    }

    const updateId = crypto.randomUUID();
    const update = await YJS_SERVICE.createUndoUpdate(roomId, undoTarget.entry);
    const elementIds = Array.from(new Set(undoTarget.entry.changes.map((change) => change.elementId)));
    const commitResult = await HISTORY_REPOSITORY.commitUndo(
        roomId,
        expectedVersion,
        undoTarget.state.cursor,
        updateId,
        update,
        elementIds,
      );

    if (commitResult.status === 'committed' || commitResult.status === 'already_committed') {
      return {
        status: commitResult.status,
        state: commitResult.state,
        update,
        updateId,
      };
    }

    return {
      status: commitResult.status,
      state: commitResult.state,
    };
  }

  public async redo(
    roomId: string,
    expectedVersion: number,
  ): Promise<ExecuteRedoResult> {
    const redoTarget = await this.getRedoTarget(roomId);

    if (!redoTarget) {
      const state = await HISTORY_REPOSITORY.getState(roomId);

      return {
        status: 'nothing_to_redo',
        state,
      };
    }

    if (redoTarget.state.historyVersion !== expectedVersion) {
      return {
        status: 'stale',
        state: redoTarget.state,
      };
    }

    const updateId = crypto.randomUUID();
    const update = await YJS_SERVICE.createRedoUpdate(roomId, redoTarget.entry);

    const elementIds = Array.from(new Set(redoTarget.entry.changes.map((change) => change.elementId)));
    const commitResult = await HISTORY_REPOSITORY.commitRedo(
        roomId,
        expectedVersion,
        redoTarget.state.cursor,
        updateId,
        update,
        elementIds,
      );

    if (commitResult.status === 'committed' || commitResult.status === 'already_committed') {
      return {
        status: commitResult.status,
        state: commitResult.state,
        update,
        updateId,
      };
    }

    return {
      status: commitResult.status,
      state: commitResult.state,
    };
  }

  public async getRedoTarget(roomId: string): Promise<RedoHistoryTarget | null> {
    const state = await HISTORY_REPOSITORY.getState(roomId);

    if (!state.canRedo) {
      return null;
    }

    const entryIndex = state.cursor;
    const entry = await HISTORY_REPOSITORY.getEntry(roomId, entryIndex);

    if (!entry) {
      throw new Error(`Missing history entry at index ${entryIndex} for room ${roomId}`);
    }

    return {
      state,
      entry,
    };
  }
}

export const HISTORY_SERVICE = new HistoryService();
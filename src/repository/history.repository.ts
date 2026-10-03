import {
  AppendHistoryEntryResult,
  CollaborationHistoryEntry,
  CommitRedoResult,
  CommitUndoResult,
  RoomHistoryState,
} from '../interfaces';
import { REDIS_CLIENT } from '../redis';
import {
  buildRoomHistoryState,
  getRoomElementLocksKey,
  getRoomHistoryKeys,
  getRoomStateTtlSeconds,
  getRoomYjsKeys,
} from '../utils';
import { APPEND_HISTORY_ENTRY_SCRIPT, COMMIT_REDO_SCRIPT, COMMIT_UNDO_SCRIPT, GET_HISTORY_STATE_SCRIPT } from './scripts';

const MAX_HISTORY_ENTRIES = 100;

export class HistoryRepository {
  public async append(
    roomId: string,
    entry: CollaborationHistoryEntry
  ): Promise<AppendHistoryEntryResult> {
    const { entriesKey, metaKey, seenEntryIdsKey } = getRoomHistoryKeys(roomId);

    const ttlSeconds = getRoomStateTtlSeconds();

    const result = await REDIS_CLIENT.eval(
      APPEND_HISTORY_ENTRY_SCRIPT,
      {
        keys: [
          entriesKey,
          metaKey,
          seenEntryIdsKey,
        ],
        arguments: [
          entry.entryId,
          JSON.stringify(entry),
          String(MAX_HISTORY_ENTRIES),
          String(ttlSeconds),
        ],
      },
    ) as unknown as [number, number, number, number];

    const [ appended, cursor, historyVersion, historyLength ] = result;

    return {
      appended: appended === 1,
      state: buildRoomHistoryState(cursor, historyVersion, historyLength),
    };
  }

  public async getState(roomId: string): Promise<RoomHistoryState> {
    const { entriesKey, metaKey } = getRoomHistoryKeys(roomId);

    const result = await REDIS_CLIENT.eval(
      GET_HISTORY_STATE_SCRIPT,
      {
        keys: [
          metaKey,
          entriesKey,
        ],
        arguments: [],
      },
    ) as unknown as [number, number, number];

    const [ cursor, historyVersion, historyLength ] = result;

    return buildRoomHistoryState(cursor, historyVersion, historyLength);
  }

  public async getEntry(
    roomId: string,
    index: number,
  ): Promise<CollaborationHistoryEntry | null> {
    if (index < 0) {
      return null;
    }

    const { entriesKey } = getRoomHistoryKeys(roomId);
    const serializedEntry = await REDIS_CLIENT.lIndex(entriesKey, index);

    if (!serializedEntry) {
      return null;
    }

    return JSON.parse(serializedEntry) as CollaborationHistoryEntry;
  }

  public async commitUndo(
    roomId: string,
    expectedVersion: number,
    expectedCursor: number,
    updateId: string,
    update: string,
    elementIds: string[]
  ): Promise<CommitUndoResult> {
    const { entriesKey, metaKey, seenEntryIdsKey } = getRoomHistoryKeys(roomId);
    const { updatesKey, seenUpdateIdsKey } = getRoomYjsKeys(roomId);
    const ttlSeconds = getRoomStateTtlSeconds();
    const locksKey = getRoomElementLocksKey(roomId);

    const result = await REDIS_CLIENT.eval(
        COMMIT_UNDO_SCRIPT,
        {
          keys: [
            metaKey,
            entriesKey,
            seenEntryIdsKey,
            updatesKey,
            seenUpdateIdsKey,
            locksKey,
          ],
          arguments: [
            String(expectedVersion),
            String(expectedCursor),
            updateId,
            update,
            String(ttlSeconds),
            ...elementIds,
          ],
        },
      ) as [number, number, number, number, string];

    const [
      status,
      cursor,
      historyVersion,
      historyLength,
      streamId,
    ] = result;

    const state: RoomHistoryState = {
      cursor,
      historyVersion,
      historyLength,
      canUndo: cursor > 0,
      canRedo: cursor < historyLength,
    };

    if (status === 1) {
      return {
        status: 'committed',
        state,
        streamId,
      };
    }

    if (status === 2) {
      return {
        status: 'already_committed',
        state,
        streamId,
      };
    }

    if (status === 3) {
      return {
        status: 'nothing_to_undo',
        state,
      };
    }

    if (status === 4) {
      return {
        status: 'edit_conflict',
        state,
      };
    }

    return {
      status: 'stale',
      state,
    };
  }

  public async commitRedo(
    roomId: string,
    expectedVersion: number,
    expectedCursor: number,
    updateId: string,
    update: string,
    elementIds: string[],
  ): Promise<CommitRedoResult> {
    const { entriesKey, metaKey, seenEntryIdsKey } = getRoomHistoryKeys(roomId);
    const { updatesKey, seenUpdateIdsKey } = getRoomYjsKeys(roomId);
    const locksKey = getRoomElementLocksKey(roomId);
    const ttlSeconds = getRoomStateTtlSeconds();

    const result = await REDIS_CLIENT.eval(
        COMMIT_REDO_SCRIPT,
        {
          keys: [
            metaKey,
            entriesKey,
            seenEntryIdsKey,
            updatesKey,
            seenUpdateIdsKey,
            locksKey,
          ],
          arguments: [
            String(expectedVersion),
            String(expectedCursor),
            updateId,
            update,
            String(ttlSeconds),
            ...elementIds,
          ],
        },
      ) as [number, number, number, number, string];

    const [ status, cursor, historyVersion, historyLength, streamId] = result;
    const state = buildRoomHistoryState(cursor, historyVersion, historyLength);

    if (status === 1) {
      return {
        status: 'committed',
        state,
        streamId,
      };
    }

    if (status === 2) {
      return {
        status: 'already_committed',
        state,
        streamId,
      };
    }

    if (status === 3) {
      return {
        status: 'nothing_to_redo',
        state,
      };
    }

    if (status === 4) {
      return {
        status: 'edit_conflict',
        state,
      };
    }

    return {
      status: 'stale',
      state,
    };
  }
}

export const HISTORY_REPOSITORY = new HistoryRepository();
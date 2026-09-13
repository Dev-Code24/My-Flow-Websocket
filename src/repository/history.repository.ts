import { AppendHistoryEntryResult, CollaborationHistoryEntry, RoomHistoryState } from '../@interfaces';
import { REDIS_CLIENT } from '../redis';
import { buildRoomHistoryState, getRoomHistoryKeys, getRoomHistoryTtlSeconds } from "../utils";
import { APPEND_HISTORY_ENTRY_SCRIPT, GET_HISTORY_STATE_SCRIPT } from "./scripts";

const MAX_HISTORY_ENTRIES = 100;

export class HistoryRepository {
  public async append(roomId: string, entry: CollaborationHistoryEntry): Promise<AppendHistoryEntryResult> {
    const { entriesKey, metaKey, seenEntryIdsKey } = getRoomHistoryKeys(roomId);

    const ttlSeconds = getRoomHistoryTtlSeconds();

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
}

export const HISTORY_REPOSITORY = new HistoryRepository();
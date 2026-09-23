import { RoomHistoryState } from '../interfaces';

export function getRoomHistoryKeys(
  roomId: string
): {
  entriesKey: string;
  metaKey: string;
  seenEntryIdsKey: string;
} {
  const prefix = `myflow:room:{${roomId}}:history`;

  return {
    entriesKey: `${prefix}:entries`,
    metaKey: `${prefix}:meta`,
    seenEntryIdsKey: `${prefix}:seen-entry-ids`,
  };
}

export function getRoomYjsKeys(roomId: string): {
  updatesKey: string;
  seenUpdateIdsKey: string;
} {
  const prefix = `myflow:room:{${roomId}}:yjs`;

  return {
    updatesKey: `${prefix}:updates`,
    seenUpdateIdsKey: `${prefix}:seen-update-ids`,
  };
}

export function buildRoomHistoryState(
  cursor: number,
  historyVersion: number,
  historyLength: number,
): RoomHistoryState {
  return {
    cursor,
    historyVersion,
    historyLength,
    canUndo: cursor > 0,
    canRedo: cursor < historyLength,
  };
}

export function getRoomStateTtlSeconds(): number {
  const ttl = Number(process.env.ROOM_HISTORY_TTL_SECONDS);

  if ( !Number.isInteger(ttl) || ttl <= 0 ) {
    throw new Error('ROOM_HISTORY_TTL_SECONDS must be a positive integer');
  }

  return ttl;
}
import { RoomHistoryState } from '../interfaces';

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

export function getRoomElementLocksKey(roomId: string): string {
  return `myflow:room:{${roomId}}:element-locks`;
}
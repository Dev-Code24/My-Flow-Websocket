export function getRoomHistoryKeys(roomId: string): {
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
  snapshotKey: string;
  updatesKey: string;
  seenUpdateIdsKey: string;
} {
  const prefix = `myflow:room:{${roomId}}:yjs`;

  return {
    snapshotKey: `${prefix}:snapshot`,
    updatesKey: `${prefix}:updates`,
    seenUpdateIdsKey: `${prefix}:seen-update-ids`,
  };
}

export function getRoomParticipantsKey(roomId: string): string {
  return `myflow:room:{${roomId}}:participants`;
}
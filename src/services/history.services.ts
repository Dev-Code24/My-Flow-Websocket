import { AppendHistoryEntryResult, CollaborationHistoryEntry, HistoryEntryDraft, RoomHistoryState } from '../@interfaces';
import { HISTORY_REPOSITORY } from '../repository';

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
}

export const HISTORY_SERVICE = new HistoryService();
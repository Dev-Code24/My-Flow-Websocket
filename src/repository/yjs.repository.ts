import { REDIS_CLIENT } from '../redis';
import { getRoomStateTtlSeconds, getRoomYjsKeys } from '../utils';
import { APPEND_YJS_UPDATE_IF_TAIL_MATCHES_SCRIPT, APPEND_YJS_UPDATE_SCRIPT, COMPACT_YJS_SCRIPT } from './scripts';

export interface AppendYjsUpdateResult {
  appended: boolean;
  streamId: string;
}

export interface YjsSnapshot {
  update: string;
  watermark: string;
}

export interface YjsUpdateStreamEntry {
  id: string;
  update: string;
  updateId: string;
}

export interface CommitYjsSnapshotResult {
  committed: boolean;
}

export type ConditionalAppendYjsUpdateResult =
  | {
  status: 'committed';
  streamId: string;
}
  | {
  status: 'already_committed';
  streamId: string;
}
  | {
  status: 'stale';
  currentTail: string | null;
};

export class YjsRepository {
  public async appendUpdate(
    roomId: string,
    updateId: string,
    update: string,
  ): Promise<AppendYjsUpdateResult> {
    const { updatesKey, seenUpdateIdsKey } = getRoomYjsKeys(roomId);
    const ttlSeconds = getRoomStateTtlSeconds();
    const result = await REDIS_CLIENT.eval(
        APPEND_YJS_UPDATE_SCRIPT,
        {
          keys: [
            updatesKey,
            seenUpdateIdsKey,
          ],
          arguments: [
            updateId,
            update,
            String(ttlSeconds),
          ],
        },
      ) as unknown as [number, string];

    const [appended, streamId] = result;

    return {
      appended: appended === 1,
      streamId,
    };
  }

  public async getUpdates(roomId: string): Promise<YjsUpdateStreamEntry[]> {
    return this.getUpdatesAfter(roomId, null);
  }

  public async getSnapshot(roomId: string): Promise<YjsSnapshot | null> {
    const { snapshotKey } = getRoomYjsKeys(roomId);
    const snapshot = await REDIS_CLIENT.hGetAll(snapshotKey);

    if (!snapshot.update || !snapshot.watermark) {
      return null;
    }

    return {
      update: snapshot.update,
      watermark: snapshot.watermark,
    };
  }

  public async getUpdatesAfter(
    roomId: string,
    watermark: string | null,
  ): Promise<YjsUpdateStreamEntry[]> {
    const { updatesKey } = getRoomYjsKeys(roomId);

    const start = watermark === null ? '-' : `(${watermark}`;
    const entries = await REDIS_CLIENT.xRange(updatesKey, start, '+');

    return entries.map((entry) => {
      const updateId = entry.message.updateId;
      const update = entry.message.update;

      if (!updateId || !update) {
        throw new Error(`Invalid Yjs update stream entry: ${entry.id}`);
      }

      return {
        id: entry.id,
        updateId,
        update,
      };
    });
  }

  public async commitSnapshot(
    roomId: string,
    expectedSnapshotWatermark: string | null,
    newSnapshotWatermark: string,
    snapshotUpdate: string,
  ): Promise<CommitYjsSnapshotResult> {
    const { snapshotKey, updatesKey, seenUpdateIdsKey } = getRoomYjsKeys(roomId);

    const ttlSeconds = getRoomStateTtlSeconds();

    const result = await REDIS_CLIENT.eval(
        COMPACT_YJS_SCRIPT,
        {
          keys: [
            snapshotKey,
            updatesKey,
            seenUpdateIdsKey,
          ],
          arguments: [
            expectedSnapshotWatermark ?? '',
            newSnapshotWatermark,
            snapshotUpdate,
            String(ttlSeconds),
          ],
        },
      ) as number;

    return {
      committed: result === 1,
    };
  }

  public async getUncompactedUpdateCount(roomId: string): Promise<number> {
    const { snapshotKey, updatesKey } = getRoomYjsKeys(roomId);

    const [snapshotWatermark, streamLength] = await Promise.all([
      REDIS_CLIENT.hGet(snapshotKey, 'watermark'),
      REDIS_CLIENT.xLen(updatesKey),
    ]);

    if (!snapshotWatermark) {
      return streamLength;
    }

    return Math.max(0, streamLength - 1);
  }

  public async appendUpdateIfTailMatches(
    roomId: string,
    expectedTail: string | null,
    updateId: string,
    update: string,
  ): Promise<ConditionalAppendYjsUpdateResult> {
    const { updatesKey, seenUpdateIdsKey } = getRoomYjsKeys(roomId);

    const ttlSeconds = getRoomStateTtlSeconds();

    const result = await REDIS_CLIENT.eval(
        APPEND_YJS_UPDATE_IF_TAIL_MATCHES_SCRIPT,
        {
          keys: [
            updatesKey,
            seenUpdateIdsKey,
          ],
          arguments: [
            expectedTail ?? '',
            updateId,
            update,
            String(ttlSeconds),
          ],
        },
      ) as unknown as [number, string];

    const [statusCode, value] = result;

    if (statusCode === 1) {
      return {
        status: 'committed',
        streamId: value,
      };
    }

    if (statusCode === 2) {
      return {
        status: 'already_committed',
        streamId: value,
      };
    }

    return {
      status: 'stale',
      currentTail:
        value || null,
    };
  }
}

export const YJS_REPOSITORY = new YjsRepository();
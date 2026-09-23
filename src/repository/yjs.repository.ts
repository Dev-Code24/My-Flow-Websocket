import { REDIS_CLIENT } from '../redis';
import { getRoomStateTtlSeconds } from '../utils';
import { APPEND_YJS_UPDATE_SCRIPT } from './scripts';

export interface AppendYjsUpdateResult {
  appended: boolean;
  streamId: string;
}

export interface YjsUpdateStreamEntry {
  id: string;
  update: string;
}

export class YjsRepository {
  public async appendUpdate(
    roomId: string,
    updateId: string,
    update: string,
  ): Promise<AppendYjsUpdateResult> {
    const { updatesKey, seenUpdateIdsKey } = this.getKeys(roomId);
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
    const { updatesKey } = this.getKeys(roomId);
    const entries = await REDIS_CLIENT.xRange(updatesKey, '-', '+');

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

  private getKeys(roomId: string): {
    updatesKey: string;
    seenUpdateIdsKey: string;
  } {
    return {
      updatesKey: `myflow:room:{${roomId}}:yjs:updates`,
      seenUpdateIdsKey: `myflow:room:{${roomId}}:yjs:seen-update-ids`,
    };
  }
}

export const YJS_REPOSITORY = new YjsRepository();
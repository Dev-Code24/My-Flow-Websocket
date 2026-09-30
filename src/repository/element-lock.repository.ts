import { REDIS_CLIENT } from '../redis';

import { ACQUIRE_ELEMENT_LOCKS_SCRIPT, RELEASE_ELEMENT_LOCKS_SCRIPT, RENEW_ELEMENT_LOCKS_SCRIPT } from './scripts';
import { getRoomStateTtlSeconds } from '../utils';

export interface AcquireElementLocksResult {
  acquired: boolean;
  lockedElementIds: string[];
}

const ELEMENT_LOCK_TTL_MILLIS = 5000;

export class ElementLockRepository {
  public async acquire(
    roomId: string,
    participantId: string,
    interactionId: string,
    elementIds: string[],
  ): Promise<AcquireElementLocksResult> {
    const result = await REDIS_CLIENT.eval(
        ACQUIRE_ELEMENT_LOCKS_SCRIPT,
        {
          keys: [
            this.getLocksKey(roomId),
          ],
          arguments: [
            participantId,
            interactionId,
            String(ELEMENT_LOCK_TTL_MILLIS),
            String(getRoomStateTtlSeconds()),
            ...elementIds,
          ],
        },
      ) as unknown as [number, string];

    const [acquired, value] = result;

    if (acquired === 1) {
      return {
        acquired: true,
        lockedElementIds: [],
      };
    }

    return {
      acquired: false,
      lockedElementIds: JSON.parse(value) as string[],
    };
  }

  public async renew(
    roomId: string,
    participantId: string,
    interactionId: string,
    elementIds: string[],
  ): Promise<boolean> {
    const result = await REDIS_CLIENT.eval(
        RENEW_ELEMENT_LOCKS_SCRIPT,
        {
          keys: [
            this.getLocksKey(roomId),
          ],
          arguments: [
            participantId,
            interactionId,
            String(ELEMENT_LOCK_TTL_MILLIS),
            String(getRoomStateTtlSeconds()),
            ...elementIds,
          ],
        },
      ) as number;

    return result === 1;
  }

  public async release(
    roomId: string,
    participantId: string,
    interactionId: string,
    elementIds: string[],
  ): Promise<void> {
    await REDIS_CLIENT.eval(
      RELEASE_ELEMENT_LOCKS_SCRIPT,
      {
        keys: [
          this.getLocksKey(roomId),
        ],
        arguments: [
          participantId,
          interactionId,
          ...elementIds,
        ],
      },
    );
  }

  private getLocksKey(roomId: string): string {
    return `myflow:room:{${roomId}}:element-locks`;
  }
}

export const ELEMENT_LOCK_REPOSITORY = new ElementLockRepository();
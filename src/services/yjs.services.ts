import * as Y from 'yjs';

import { YJS_REPOSITORY } from '../repository';
import { CollaborationHistoryEntry } from "../interfaces";
import { applyRedoEntry, applyUndoEntry } from "../utils/history-yjs.utils";

const REDIS_WRITE_ATTEMPT_DELAYS_MS = [ 0, 50, 150] as const;

export class YjsService {
  private async wait(milliseconds: number): Promise<void> {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, milliseconds);
    });
  }

  public async persistUpdate(
    roomId: string,
    updateId: string,
    update: string,
  ): Promise<string> {
    let lastError: unknown;

    for (const [attemptIndex, delayMs] of REDIS_WRITE_ATTEMPT_DELAYS_MS.entries()) {
      if (delayMs > 0) {
        await this.wait(delayMs);
      }

      try {
        const result = await YJS_REPOSITORY.appendUpdate(roomId, updateId, update);

        return result.streamId;
      } catch (error) {
        lastError = error;

        console.warn(
          `Failed to persist Yjs update ${updateId}. Attempt ${attemptIndex + 1}/${REDIS_WRITE_ATTEMPT_DELAYS_MS.length}`,
          error,
        );
      }
    }

    if (lastError instanceof Error) {
      throw lastError;
    }

    throw new Error(`Failed to persist Yjs update ${updateId}`);
  }

  public async getDocument(roomId: string): Promise<Y.Doc> {
    const document = new Y.Doc();
    const updates = await YJS_REPOSITORY.getUpdates(roomId);

    updates.forEach(({ update }) => {
      const binaryUpdate = Uint8Array.from(Buffer.from(update, 'base64'));

      Y.applyUpdate(document, binaryUpdate);
    });

    return document;
  }

  public async reconstructDocument(roomId: string): Promise<Y.Doc> {
    const document = new Y.Doc();
    const updates = await YJS_REPOSITORY.getUpdates(roomId);

    for (const entry of updates) {
      const update = Buffer.from(entry.update, 'base64');

      Y.applyUpdate(document, update);
    }

    return document;
  }

  public async createUndoUpdate(
    roomId: string,
    entry: CollaborationHistoryEntry,
  ): Promise<string> {
    const document = await this.reconstructDocument(roomId);

    let undoUpdate: Uint8Array | null = null;

    const handleUpdate = (update: Uint8Array): void => {
      undoUpdate = update;
    };

    document.once('update', handleUpdate);

    applyUndoEntry(document, entry);

    if (undoUpdate === null) {
      throw new Error(`Undo did not produce a Yjs update for room ${roomId}`);
    }

    return Buffer.from(undoUpdate).toString('base64');
  }

  public async createRedoUpdate(
    roomId: string,
    entry: CollaborationHistoryEntry,
  ): Promise<string> {
    const document = await this.reconstructDocument(roomId);
    let redoUpdate: Uint8Array | null = null;

    const handleUpdate = (update: Uint8Array): void => {
      redoUpdate = update;
    };

    document.once('update', handleUpdate);

    applyRedoEntry(document, entry);

    if (redoUpdate === null) {
      throw new Error(`Redo did not produce a Yjs update for room ${roomId}`);
    }

    return Buffer.from(redoUpdate).toString('base64');
  }
}

export const YJS_SERVICE = new YjsService();
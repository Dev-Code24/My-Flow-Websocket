import * as Y from 'yjs';

import { YJS_REPOSITORY } from '../repository';
import { CollaborationHistoryEntry, ContinueImportElement } from "../interfaces";
import { applyRedoEntry, applyUndoEntry } from "../utils/history-yjs.utils";
import { applyContinueImport } from "../utils/yjs-document.utils";

interface ReconstructedYjsDocument {
  document: Y.Doc;
  snapshotWatermark: string | null;
  lastAppliedStreamId: string | null;
}

export type ContinueImportResult =
  | {
  status: 'committed';
  updateId: string;
  update: string;
}
  | {
  status: 'already_committed';
};

const REDIS_WRITE_ATTEMPT_DELAYS_MS = [ 0, 50, 150] as const;
const YJS_COMPACTION_UPDATE_THRESHOLD = 100;
const CONTINUE_IMPORT_MAX_ATTEMPTS = 10;

export class YjsService {
  private readonly roomsBeingCompacted = new Set<string>();

  private async wait(milliseconds: number): Promise<void> {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, milliseconds);
    });
  }

  private async reconstructDocumentState(roomId: string): Promise<ReconstructedYjsDocument> {
    while (true) {
      const snapshotBefore = await YJS_REPOSITORY.getSnapshot(roomId);
      const document = new Y.Doc();

      if (snapshotBefore) {
        this.applyBase64Update(document, snapshotBefore.update);
      }

      const updates = await YJS_REPOSITORY.getUpdatesAfter(roomId, snapshotBefore?.watermark ?? null);

      for (const entry of updates) {
        this.applyBase64Update(document, entry.update);
      }

      const snapshotAfter = await YJS_REPOSITORY.getSnapshot(roomId);
      const snapshotWatermarkBefore = snapshotBefore?.watermark ?? null;
      const snapshotWatermarkAfter = snapshotAfter?.watermark ?? null;

      if (snapshotWatermarkBefore === snapshotWatermarkAfter) {
        const lastUpdate = updates.length > 0 ? updates[updates.length - 1] : undefined;

        return {
          document,
          snapshotWatermark:
          snapshotWatermarkBefore,
          lastAppliedStreamId: lastUpdate ? lastUpdate.id : snapshotWatermarkBefore,
        };
      }

      document.destroy();
    }
  }

  private applyBase64Update(
    document: Y.Doc,
    update: string,
  ): void {
    const binaryUpdate = Buffer.from(update, 'base64');
    Y.applyUpdate(document, binaryUpdate);
  }

  private async maybeCompactDocument(roomId: string): Promise<void> {
    if (this.roomsBeingCompacted.has(roomId)) {
      return;
    }

    try {
      const uncompactedUpdateCount = await YJS_REPOSITORY.getUncompactedUpdateCount(roomId);

      if (uncompactedUpdateCount < YJS_COMPACTION_UPDATE_THRESHOLD) {
        return;
      }

      if (this.roomsBeingCompacted.has(roomId)) {
        return;
      }

      this.roomsBeingCompacted.add(roomId);

      const compacted = await this.compactDocument(roomId);

      if (compacted) {
        console.log(`Compacted Yjs document for room ${roomId}`);
      }
    } catch (error) {
      console.error(`Failed to compact Yjs document for room ${roomId}`, error);
    } finally {
      const wasCompacting = this.roomsBeingCompacted.delete(roomId);

      if (wasCompacting) {
        void this.maybeCompactDocument(roomId);
      }
    }
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

        if (result.appended) {
          void this.maybeCompactDocument(roomId);
        }

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
    const { document } = await this.reconstructDocumentState(roomId);
    return document;
  }

  public async continueImport(
    roomId: string,
    requestId: string,
    elements: ContinueImportElement[],
  ): Promise<ContinueImportResult> {
    for (let attempt = 0; attempt < CONTINUE_IMPORT_MAX_ATTEMPTS; ++attempt) {
      const { document, lastAppliedStreamId } = await this.reconstructDocumentState(roomId);

      try {
        const stateVectorBeforeImport = Y.encodeStateVector(document);

        applyContinueImport(document, elements);

        const binaryUpdate = Y.encodeStateAsUpdate(document, stateVectorBeforeImport);
        const update = Buffer.from(binaryUpdate).toString('base64');
        const result = await YJS_REPOSITORY
            .appendUpdateIfTailMatches(
              roomId,
              lastAppliedStreamId,
              requestId,
              update,
            );

        if (result.status === 'stale') {
          continue;
        }

        if (result.status === 'already_committed') {
          return {
            status:
              'already_committed',
          };
        }

        void this.maybeCompactDocument(roomId);

        return {
          status: 'committed',
          updateId: requestId,
          update,
        };
      } finally {
        document.destroy();
      }
    }

    throw new Error(`Failed to commit Continue import for room ${roomId} after ${CONTINUE_IMPORT_MAX_ATTEMPTS} attempts`,);
  }

  public async createUndoUpdate(
    roomId: string,
    entry: CollaborationHistoryEntry,
  ): Promise<string> {
    const { document } = await this.reconstructDocumentState(roomId);

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
    const { document } = await this.reconstructDocumentState(roomId);
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

  public async compactDocument(roomId: string): Promise<boolean> {
    const { document, snapshotWatermark, lastAppliedStreamId } = await this.reconstructDocumentState(roomId);

    try {
      if (lastAppliedStreamId === null || lastAppliedStreamId === snapshotWatermark) {
        return false;
      }

      const snapshotUpdate = Y.encodeStateAsUpdate(document);
      const encodedSnapshot = Buffer.from(snapshotUpdate).toString('base64');

      const result = await YJS_REPOSITORY.commitSnapshot(
          roomId,
          snapshotWatermark,
          lastAppliedStreamId,
          encodedSnapshot,
        );

      return result.committed;
    } finally {
      document.destroy();
    }
  }

  public async getEncodedDocumentState(roomId: string): Promise<string> {
    const {document } = await this.reconstructDocumentState(roomId);

    try {
      const update = Y.encodeStateAsUpdate(document);

      return Buffer.from(update).toString('base64');
    } finally {
      document.destroy();
    }
  }
}

export const YJS_SERVICE = new YjsService();
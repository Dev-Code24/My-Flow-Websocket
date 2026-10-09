import { RawData } from 'ws';

import { ClientSocket, WsMessage, WsMessageType } from '../interfaces';
import { broadcastToClient, broadcastToRoom, isHistoryEntryDraft } from '../utils';
import { EDIT_SERVICE, HISTORY_SERVICE, YJS_SERVICE } from '../services';

export async function handleWebSocketMessage(
  roomId: string,
  client: ClientSocket,
  data: RawData,
): Promise<void> {
  let message: WsMessage;

  try {
    message = JSON.parse(data.toString()) as WsMessage;
  } catch (error) {
    console.error(`Failed to parse websocket message from ${client.participantId}`, error);

    return;
  }

  switch (message.type) {
    case WsMessageType.YJS_UPDATE: {
      try {
        await YJS_SERVICE.persistUpdate(roomId, message.message.updateId, message.message.update);
        broadcastToRoom<WsMessage<WsMessageType.YJS_UPDATE>>(roomId, message, client);
      } catch (error) {
        console.error('Failed to persist YJS_UPDATE', error);
      }

      return;
    }

    case WsMessageType.CONTINUE_IMPORT: {
      if (message.message.action !== 'request') {
        return;
      }

      const { requestId, elements } = message.message;

      try {
        const result = await YJS_SERVICE.continueImport(roomId, requestId, elements);

        if (result.status === 'committed') {
          const yjsUpdateMessage: WsMessage<WsMessageType.YJS_UPDATE> = {
            type: WsMessageType.YJS_UPDATE,
            message: {
              updateId: result.updateId,
              update: result.update,
            },
          };

          broadcastToRoom<WsMessage<WsMessageType.YJS_UPDATE>>(roomId, yjsUpdateMessage);
        }

        const completedMessage: WsMessage<WsMessageType.CONTINUE_IMPORT> = {
          type: WsMessageType.CONTINUE_IMPORT,
          message: {
            action: 'result',
            requestId,
            status: 'completed',
          },
        };

        broadcastToClient<WsMessage<WsMessageType.CONTINUE_IMPORT>>(completedMessage, client);
      } catch (error) {
        console.error(`Failed Continue import for room ${roomId}`, error);

        const failedMessage: WsMessage<WsMessageType.CONTINUE_IMPORT> = {
          type: WsMessageType.CONTINUE_IMPORT,
          message: {
            action: 'result',
            requestId: message.message.requestId,
            status: 'failed',
          },
        };

        broadcastToClient<WsMessage<WsMessageType.CONTINUE_IMPORT>>(failedMessage, client);
      }

      return;
    }

    case WsMessageType.HISTORY_ENTRY_COMMIT: {
      if (!isHistoryEntryDraft(message.message)) {
        console.error('Invalid history entry received', client.participantId);
        return;
      }

      try {
        const result = await HISTORY_SERVICE.commitEntry(client.roomId, client.participantId, message.message);
        const response: WsMessage<WsMessageType.ROOM_HISTORY_STATE> = {
          type: WsMessageType.ROOM_HISTORY_STATE,
          message: result.state,
        };

        if (result.appended) {
          broadcastToRoom(client.roomId, response);
        } else {
          broadcastToClient(response, client);
        }
      } catch (error) {
        console.error('Failed to commit history entry', error);
      }

      return;
    }

    case WsMessageType.UNDO_REQUEST: {
      const {expectedVersion } = message.message;
      const result = await HISTORY_SERVICE.undo(roomId, expectedVersion);

      if (result.status !== 'committed' && result.status !== 'already_committed') {
        return;
      }

      const yjsUpdateMessage: WsMessage<WsMessageType.YJS_UPDATE> = {
        type: WsMessageType.YJS_UPDATE,
        message: {
          updateId: result.updateId,
          update: result.update,
        },
      };

      broadcastToRoom<WsMessage<WsMessageType.YJS_UPDATE>>(roomId, yjsUpdateMessage);

      const roomHistoryStateMessage: WsMessage<WsMessageType.ROOM_HISTORY_STATE> = {
        type:
        WsMessageType.ROOM_HISTORY_STATE,
        message: result.state,
      };

      broadcastToRoom<WsMessage<WsMessageType.ROOM_HISTORY_STATE>>(roomId, roomHistoryStateMessage);
      return;
    }

    case WsMessageType.REDO_REQUEST: {
      const { expectedVersion } = message.message;
      const result = await HISTORY_SERVICE.redo(roomId, expectedVersion);

      if (result.status !== 'committed' && result.status !== 'already_committed') {
        return;
      }

      const yjsUpdateMessage: WsMessage<WsMessageType.YJS_UPDATE> = {
          type: WsMessageType.YJS_UPDATE,
          message: {
            updateId: result.updateId,
            update: result.update,
          },
        };

      broadcastToRoom<WsMessage<WsMessageType.YJS_UPDATE>>(roomId, yjsUpdateMessage);

      const roomHistoryStateMessage: WsMessage<WsMessageType.ROOM_HISTORY_STATE> = {
          type:
          WsMessageType.ROOM_HISTORY_STATE,
          message: result.state,
        };

      broadcastToRoom<WsMessage<WsMessageType.ROOM_HISTORY_STATE>>(roomId, roomHistoryStateMessage);

      return;
    }

    case WsMessageType.EDIT_BEGIN: {
      const { editId, elementIds } = message.message;

      if (elementIds.length === 0) {
        return;
      }

      const accepted = await EDIT_SERVICE.beginEdit(
          roomId,
          client.participantId,
          editId,
          elementIds,
        );

      if (accepted) {
        const response: WsMessage<WsMessageType.EDIT_ACCEPTED> = {
          type: WsMessageType.EDIT_ACCEPTED,
          message: {
            editId,
          },
        };

        broadcastToClient<WsMessage<WsMessageType.EDIT_ACCEPTED>>(response, client);

        return;
      }

      const response: WsMessage<WsMessageType.EDIT_REJECTED> = {
        type: WsMessageType.EDIT_REJECTED,
        message: {
          editId,
        },
      };

      broadcastToClient<WsMessage<WsMessageType.EDIT_REJECTED>>(response, client);

      return;
    }

    case WsMessageType.EDIT_KEEP_ALIVE: {
      const { editId, elementIds } = message.message;

      await EDIT_SERVICE.keepAlive(
        roomId,
        client.participantId,
        editId,
        elementIds,
      );

      return;
    }

    case WsMessageType.EDIT_END: {
      const { editId, elementIds } = message.message;

      await EDIT_SERVICE.endEdit(
        roomId,
        client.participantId,
        editId,
        elementIds,
      );

      return;
    }
  }
}
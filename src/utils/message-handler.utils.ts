import { RawData } from 'ws';

import { ClientSocket, WsMessage, WsMessageType } from '../@interfaces';
import { broadcastToClient, broadcastToRoom, buildWsResponse, isHistoryEntryDraft } from '../utils';
import { ROOM_MANAGER } from '../room-manager';
import { HISTORY_SERVICE } from '../services';

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
    case WsMessageType.YJS_SYNC_STEP_1: {
      handleYjsSyncStepOne(roomId, client, message);
      return;
    }
    case WsMessageType.YJS_SYNC_STEP_2:
    case WsMessageType.YJS_UPDATE: {
      broadcastToRoom(roomId, message, client);
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
  }
}

function handleYjsSyncStepOne(
  roomId: string,
  client: ClientSocket,
  message: WsMessage<WsMessageType.YJS_SYNC_STEP_1>,
): void {
  const syncPeer = ROOM_MANAGER.getParticipant(roomId, message.message.peerParticipantId);

  if (!syncPeer) {
    return;
  }

  const forwardedMessage: WsMessage<WsMessageType.YJS_SYNC_STEP_1> =
    buildWsResponse(
      WsMessageType.YJS_SYNC_STEP_1,
      {
        peerParticipantId: client.participantId,
        stateVector: message.message.stateVector,
      },
    );

  broadcastToClient(forwardedMessage, syncPeer);
}
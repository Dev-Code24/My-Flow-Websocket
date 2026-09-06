import { RawData } from 'ws';

import { ClientSocket, WsMessage, WsMessageType } from '../@interfaces';
import { broadcastToClient, broadcastToRoom, buildWsResponse } from '../utils';
import { ROOM_MANAGER } from '../websocket/room-manager';

export function handleWebSocketMessage(
  roomId: string,
  client: ClientSocket,
  data: RawData,
): void {
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
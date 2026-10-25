import { randomUUID } from 'crypto';
import { ClientSocket, WsMessage, WsMessageType, WsRequest } from '../interfaces';
import {
  buildConnectionEstablishedResponse,
  buildRoomStateResponse,
  buildUserJoinedResponse,
  buildUserLeftResponse,
  buildYjsSyncResponse,
} from './websocket.utils';
import { ROOM_MANAGER } from '../room-manager';
import { HISTORY_SERVICE, YJS_SERVICE } from '../services';
import { broadcastToClient, broadcastToRoom } from './broadcast.utils';
import {
  publishRoomMessage,
  subscribeToRoom, unsubscribeToRoom,
} from '../redis';
import { WS_INSTANCE_ID } from '../runtime';

export async function handleConnectionOpen(req: WsRequest, client: ClientSocket): Promise<void> {
  const participant = req.participant;
  const { roomId, displayName, participantId } = participant;

  client.roomId = participant.roomId;
  client.displayName = participant.displayName;
  client.participantId = participant.participantId;
  client.connectionId = `${WS_INSTANCE_ID}:${randomUUID()}`;

  const connectionEstablishedRes: WsMessage<WsMessageType.CONNECTION_ESTABLISHED> = buildConnectionEstablishedResponse(participantId, roomId, displayName);
  const userJoinedRes: WsMessage<WsMessageType.USER_JOINED> = buildUserJoinedResponse(participantId, displayName);
  const hasLocalParticipants = ROOM_MANAGER.getRoomParticipants(roomId).size > 0;

  if (!hasLocalParticipants) {
    await subscribeToRoom(roomId);
  }

  const isNewParticipant = await ROOM_MANAGER.join(client);

  const presenceHeartbeat = setInterval(() => {
    void ROOM_MANAGER
      .keepAlive(client)
      .then((isStillOwner) => {
        if (!isStillOwner) {
          client.close(4001, 'Connection replaced');
        }
      })
      .catch((error) => {
        console.error(`Failed room heartbeat for ${client.participantId}`, error);
      });
  }, 10_000);

  client.once('close', () => {
    clearInterval(presenceHeartbeat);

    void handleConnectionClosed(client);
  });

  client.on('error', (error) => {
    console.error(`Socket error for ${client.participantId}`, error);
  });

  if (isNewParticipant) {
    try {
      await publishRoomMessage<WsMessageType.USER_JOINED>(roomId, userJoinedRes);
    } catch (error) {
      console.error(`Failed to publish USER_JOINED for room ${roomId}`, error);
    }

    broadcastToRoom<WsMessage<WsMessageType.USER_JOINED>>(roomId, userJoinedRes, client);
  }

  console.log(`${displayName} joined the room ${roomId}`);
  console.log(`${roomId} has ${ ROOM_MANAGER.getRoomParticipants(roomId).size } participants`);

  const participants = await ROOM_MANAGER.getGlobalParticipants(roomId);
  const roomState: WsMessage<WsMessageType.ROOM_STATE> = buildRoomStateResponse(participants);
  const historyState = await HISTORY_SERVICE.getRoomState(roomId);

  const roomHistoryState: WsMessage<WsMessageType.ROOM_HISTORY_STATE> = {
    type: WsMessageType.ROOM_HISTORY_STATE,
    message: historyState,
  };

  broadcastToClient<WsMessage<WsMessageType.ROOM_HISTORY_STATE>>(roomHistoryState, client);
  broadcastToClient<WsMessage<WsMessageType.CONNECTION_ESTABLISHED>>(connectionEstablishedRes, client);
  broadcastToClient<WsMessage<WsMessageType.ROOM_STATE>>(roomState, client);

  try {
    const initialUpdate = await YJS_SERVICE.getEncodedDocumentState(roomId);
    const yjsSync: WsMessage<WsMessageType.YJS_SYNC> = buildYjsSyncResponse(initialUpdate);

    broadcastToClient<WsMessage<WsMessageType.YJS_SYNC>>(yjsSync, client);
  } catch (error) {
    console.error(`Failed to synchronize Yjs document for room ${roomId}`, error);
    client.close(1011, 'Initial synchronization failed');
    return;
  }
}

async function handleConnectionClosed(client: ClientSocket): Promise<void> {
  const didLeaveGlobally = await ROOM_MANAGER.leave(client);

  if (didLeaveGlobally) {
    const userLeftRes: WsMessage<WsMessageType.USER_LEFT> = buildUserLeftResponse(client.participantId, client.displayName);

    try {
      await publishRoomMessage<WsMessageType.USER_LEFT>(client.roomId, userLeftRes);
    } catch (error) {
      console.error(`Failed to publish USER_LEFT for room ${client.roomId}`, error);
    }

    broadcastToRoom<WsMessage<WsMessageType.USER_LEFT>>(client.roomId, userLeftRes);

    console.log(`${client.displayName} left the room ${client.roomId}`);
  }

  const hasLocalParticipants = ROOM_MANAGER.getRoomParticipants(client.roomId).size > 0;

  if (!hasLocalParticipants) {
    try {
      await unsubscribeToRoom(client.roomId);
    } catch (error) {
      console.error(`Failed to unsubscribe from room ${client.roomId}`, error);
    }
  }
}
import { ClientSocket, MessageMap, WsMessage, WsMessageType } from '../@interfaces';
import { ROOM_MANAGER } from '../room-manager';
import { broadcastToRoom } from './broadcast.utils';

export function buildWsResponse<T extends WsMessageType>(
  type: T,
  message: MessageMap[T]
): WsMessage<T> {
  return {
    type,
    message,
  };
}

export function buildConnectionEstablishedResponse(
  participantId: string,
  roomId: string,
  displayName: string,
  syncRequired: boolean,
): WsMessage<WsMessageType.CONNECTION_ESTABLISHED> {
   return buildWsResponse(
     WsMessageType.CONNECTION_ESTABLISHED,
     {
        participantId,
        roomId,
        displayName,
        syncRequired,
     },
   );
}

export function buildYjsSyncRequest(peerParticipantId: string): WsMessage<WsMessageType.YJS_SYNC_REQUEST> {
   return buildWsResponse(
     WsMessageType.YJS_SYNC_REQUEST,
     {
        peerParticipantId,
     },
   );
}

export function buildUserJoinedResponse(
   participantId: string,
   displayName: string,
): WsMessage<WsMessageType.USER_JOINED> {
   return buildWsResponse(WsMessageType.USER_JOINED, {
      participantId,
      displayName
   });
}

export function buildUserLeftResponse(
   participantId: string,
   displayName: string
): WsMessage<WsMessageType.USER_LEFT> {
   return buildWsResponse(WsMessageType.USER_LEFT, {
      participantId,
      displayName
   });
}

export function buildRoomtStateResponse(
   participants: {
      participantId: string;
      displayName: string;
   }[]
): WsMessage<WsMessageType.ROOM_STATE> {
   return buildWsResponse(WsMessageType.ROOM_STATE, {
      participants
   });
}

export function handleConnectionClosed(
  roomId: string,
  participantId: string,
  displayName: string,
  client: ClientSocket
): void {
  const userLeftRes: WsMessage<WsMessageType.USER_LEFT> =
    buildUserLeftResponse(participantId, displayName);

  client.on('close', () => {
    const didLeave = ROOM_MANAGER.leave(client);

    if (!didLeave) {
      return;
    }

    console.log(`${client.displayName} left the room ${client.roomId}`);
    console.log(
      `${client.roomId} has ${ROOM_MANAGER.getRoomParticipants(client.roomId).size} participants`
    );

    broadcastToRoom(roomId, userLeftRes, client);
  });
}

export function handleConnectionErrored(
  roomId: string,
  participantId: string,
  displayName: string,
  client: ClientSocket
): void {
   const userLeftRes: WsMessage<WsMessageType.USER_LEFT> = buildUserLeftResponse(participantId, displayName);

   client.on('error', (error) => {
      const didLeave = ROOM_MANAGER.leave(client);

      if (!didLeave) {
        return;
      }

      console.error(`Socket error for ${client.participantId}`, error);
      console.log(`${client.displayName} left the room ${client.roomId}`);
      console.log(`${client.roomId} has ${ROOM_MANAGER.getRoomParticipants(client.roomId)} participants`);

      broadcastToRoom(roomId, userLeftRes, client);
   });

}
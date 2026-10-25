import { MessageMap, WsMessage, WsMessageType } from '../interfaces';

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
): WsMessage<WsMessageType.CONNECTION_ESTABLISHED> {
  return buildWsResponse<WsMessageType.CONNECTION_ESTABLISHED>(
    WsMessageType.CONNECTION_ESTABLISHED,
    {
      participantId,
      roomId,
      displayName,
    },
  );
}

export function buildYjsSyncResponse(update: string): WsMessage<WsMessageType.YJS_SYNC> {
  return buildWsResponse(
    WsMessageType.YJS_SYNC,
    {
      update,
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

export function buildRoomStateResponse(
   participants: {
      participantId: string;
      displayName: string;
   }[]
): WsMessage<WsMessageType.ROOM_STATE> {
   return buildWsResponse(WsMessageType.ROOM_STATE, {
      participants
   });
}

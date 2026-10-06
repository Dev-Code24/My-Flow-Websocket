import { WebSocketServer } from 'ws';
import { ClientSocket, ParticipantDetails, WsMessage, WsMessageType, WsRequest } from '../interfaces';
import { ROOM_MANAGER } from '../room-manager';
import {
   broadcastToClient, broadcastToRoom, buildConnectionEstablishedResponse, buildRoomtStateResponse, buildUserJoinedResponse,
   buildYjsSyncResponse, handleConnectionClosed, handleConnectionErrored,
} from '../utils';
import { handleWebSocketMessage } from '../utils';
import { HISTORY_SERVICE, YJS_SERVICE } from '../services';

export const wss = new WebSocketServer({ noServer: true });

wss.on('connection', async (ws, req) => {
   const client = ws as ClientSocket;
   const participant = (req as WsRequest).participant;
   const { roomId, displayName, participantId } = participant;
   client.roomId = participant.roomId;
   client.displayName = participant.displayName;
   client.participantId = participant.participantId;

   const connectionEstablishedRes: WsMessage<WsMessageType.CONNECTION_ESTABLISHED> = buildConnectionEstablishedResponse(participantId, roomId, displayName);
   const userJoinedRes: WsMessage<WsMessageType.USER_JOINED> = buildUserJoinedResponse(participantId, displayName);

   ROOM_MANAGER.join(client);

   let messageProcessingQueue = Promise.resolve();

   client.on('message', (data) => {
      messageProcessingQueue = messageProcessingQueue
        .then(() => {
          return handleWebSocketMessage(roomId, client, data);
        })
        .catch((error) => {
          console.error(`Failed to process websocket message for ${participantId}`, error);
        });
   });

   console.log(`${displayName} joined the room ${roomId}`);
   console.log(`${roomId} has ${ ROOM_MANAGER.getRoomParticipants(roomId).size } participants`);

   const participants: ParticipantDetails[] = [...ROOM_MANAGER.getRoomParticipants(roomId)].map((cl: ClientSocket) => {
      return {
         displayName: cl.displayName,
         participantId: cl.participantId,
      };
   });
   const roomState: WsMessage<WsMessageType.ROOM_STATE> = buildRoomtStateResponse(participants);

   const historyState = await HISTORY_SERVICE.getRoomState(roomId);

   const roomHistoryState: WsMessage<WsMessageType.ROOM_HISTORY_STATE> = {
      type: WsMessageType.ROOM_HISTORY_STATE,
      message: historyState,
   };

   broadcastToClient<WsMessage<WsMessageType.ROOM_HISTORY_STATE>>(roomHistoryState, client);
   broadcastToClient<WsMessage<WsMessageType.CONNECTION_ESTABLISHED>>(connectionEstablishedRes, client);
   broadcastToRoom<WsMessage<WsMessageType.USER_JOINED>>(roomId, userJoinedRes, client);
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

   handleConnectionClosed(roomId, participantId, displayName, client);
   handleConnectionErrored(roomId, participantId, displayName, client);
});

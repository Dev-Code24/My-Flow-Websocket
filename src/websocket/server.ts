import { WebSocketServer } from 'ws';
import { ClientSocket, ParticipantDetails, WsMessage, WsMessageType, WsRequest } from '../@interfaces';
import { ROOM_MANAGER } from '../room-manager';
import {
   broadcastToClient, broadcastToRoom, buildConnectionEstablishedResponse, buildRoomtStateResponse, buildUserJoinedResponse,
   buildYjsSyncRequest, handleConnectionClosed, handleConnectionErrored,
} from '../utils';
import { handleWebSocketMessage } from '../utils';
import { HISTORY_SERVICE } from "../services";

export const wss = new WebSocketServer({ noServer: true });

wss.on('connection', async (ws, req) => {
   const client = ws as ClientSocket;
   const participant = (req as WsRequest).participant;
   const { roomId, displayName, participantId } = participant;
   client.roomId = participant.roomId;
   client.displayName = participant.displayName;
   client.participantId = participant.participantId;

   const existingParticipants: Set<ClientSocket> = ROOM_MANAGER.getRoomParticipants(roomId);
   const syncPeer: ClientSocket | undefined = [...existingParticipants.values()].find((existingClient: ClientSocket) => existingClient.participantId !== participantId);
   const syncRequired: boolean = syncPeer !== undefined;
   const connectionEstablishedRes: WsMessage<WsMessageType.CONNECTION_ESTABLISHED> = buildConnectionEstablishedResponse(participantId, roomId, displayName, syncRequired);
   const userJoinedRes: WsMessage<WsMessageType.USER_JOINED> = buildUserJoinedResponse(participantId, displayName);

   console.log('Initial sync peer:', {
      joiningParticipantId: participantId,
      syncPeerParticipantId:
        syncPeer
          ? syncPeer.participantId
          : null,
      syncRequired,
   });

   ROOM_MANAGER.join(client);

   client.on('message', (data) => {
      void handleWebSocketMessage(roomId, client, data);
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

   if (syncPeer) {
      broadcastToClient<WsMessage<WsMessageType.YJS_SYNC_REQUEST>>(buildYjsSyncRequest(syncPeer.participantId), client);
      broadcastToClient<WsMessage<WsMessageType.YJS_SYNC_REQUEST>>(buildYjsSyncRequest(client.participantId), syncPeer);
   }

   handleConnectionClosed(roomId, participantId, displayName, client);
   handleConnectionErrored(roomId, participantId, displayName, client);
});

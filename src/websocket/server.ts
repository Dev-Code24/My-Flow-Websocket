import { WebSocketServer } from "ws";
import { ClientSocket, ParticipantDetails, WsMessage, WsMessageType, WsRequest } from "../@interfaces";
import { ROOM_MANAGER } from "./room-manager";
import {
   broadcastToClient, broadcastToRoom, buildConnectionEstablishedResponse, buildRoomtStateResponse, buildUserJoinedResponse,
   buildYjsSyncRequest, handleConnectionClosed, handleConnectionErrored,
} from "../utils";
import { handleWebSocketMessage } from "../utils/message-handler";

export const wss = new WebSocketServer({ noServer: true });

wss.on("connection", (ws, req) => {
   const client = ws as ClientSocket;
   const participant = (req as WsRequest).participant;
   const { roomId, displayName, participantId } = participant;
   client.roomId = participant.roomId;
   client.displayName = participant.displayName;
   client.participantId = participant.participantId;
   const existingParticipants = ROOM_MANAGER.getRoomParticipants(roomId);

   const syncPeer = existingParticipants.values().next().value as ClientSocket | undefined;

   const syncRequired = syncPeer !== undefined;
   const connectionEstablishedRes: WsMessage<WsMessageType.CONNECTION_ESTABLISHED> = buildConnectionEstablishedResponse(participantId, roomId, displayName, syncRequired);
   const userJoinedRes: WsMessage<WsMessageType.USER_JOINED> = buildUserJoinedResponse(participantId, displayName);

   ROOM_MANAGER.join(client);

   client.on('message', (data) => {
      handleWebSocketMessage(roomId, client, data);
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

   broadcastToClient<WsMessage<WsMessageType.CONNECTION_ESTABLISHED>>(connectionEstablishedRes, client);
   broadcastToRoom<WsMessage<WsMessageType.USER_JOINED>>(roomId, userJoinedRes, client);
   broadcastToClient<WsMessage<WsMessageType.ROOM_STATE>>(roomState, client);

   client.on('message', (data) => {
      const message = JSON.parse(data.toString());

      switch (message.type) {
         case WsMessageType.YJS_UPDATE:
            broadcastToRoom(roomId, message, client);
            break;
      }
   });

   if (syncPeer) {
      broadcastToClient<WsMessage<WsMessageType.YJS_SYNC_REQUEST>>(buildYjsSyncRequest(syncPeer.participantId), client);
      broadcastToClient<WsMessage<WsMessageType.YJS_SYNC_REQUEST>>(buildYjsSyncRequest(client.participantId), syncPeer);
   }

   handleConnectionClosed(roomId, participantId, displayName, client);
   handleConnectionErrored(roomId, participantId, displayName, client);
});

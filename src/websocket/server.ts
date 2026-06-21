import { WebSocketServer } from "ws";
import { ClientSocket, ParticipantDetails, WsMessage, WsMessageType, WsRequest } from "../@interfaces";
import { ROOM_MANAGER } from "./room-manager";
import { broadcastToClient, broadcastToRoom, buildConnectionEstablishedResponse, buildRoomtStateResponse, buildUserJoinedResponse, handleConnectionClosed, handleConnectionErrored } from "../utils";

export const wss = new WebSocketServer({ noServer: true });

wss.on("connection", (ws, req) => {
   const client = ws as ClientSocket;
   const participant = (req as WsRequest).participant;
   const { roomId, displayName, participantId } = participant;
   const connectionEstablishedRes: WsMessage<WsMessageType.CONNECTION_ESTABLISHED> = buildConnectionEstablishedResponse(participantId, roomId, displayName);
   const userJoinedRes: WsMessage<WsMessageType.USER_JOINED> = buildUserJoinedResponse(participantId, displayName);

   client.roomId = participant.roomId;
   client.displayName = participant.displayName;
   client.participantId = participant.participantId;

   ROOM_MANAGER.join(client);
 
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

   handleConnectionClosed(roomId, participantId, displayName, client);
   handleConnectionErrored(roomId, participantId, displayName, client);
});

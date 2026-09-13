import { ClientSocket } from "../@interfaces";
import { ROOM_MANAGER } from "../room-manager";

export function broadcastToRoom<T>(
   roomId: string,
   payload: T,
   excludedClient?: ClientSocket
): void {
   const participants = ROOM_MANAGER.getRoomParticipants(roomId);

   participants.forEach((client: ClientSocket) => {
      if (excludedClient === client) { return; }

      client.send(JSON.stringify(payload));
   });
}

export function broadcastToClient<T>(data: T, client: ClientSocket): void {
   client.send(JSON.stringify(data));
}
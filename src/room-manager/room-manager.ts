import { ClientSocket } from '../@interfaces';

export class RoomManager {
   private rooms = new Map<string, Map<string, ClientSocket>>();

   public join(client: ClientSocket): void {
      const roomId = client.roomId;

      if (!this.rooms.has(roomId)) {
         this.rooms.set(roomId, new Map());
      }

      const room = this.rooms.get(roomId);

      if (!room) {
         return;
      }

      const existingClient = room.get(client.participantId);

      room.set(client.participantId, client);

      if (
        existingClient &&
        existingClient !== client
      ) {
         existingClient.close();
      }
   }

   public leave(client: ClientSocket): boolean {
      const room = this.rooms.get(client.roomId);

      if (!room) {
         return false;
      }

      const currentClient = room.get(client.participantId);

      if (currentClient !== client) {
         return false;
      }

      room.delete(client.participantId);

      if (room.size === 0) {
         this.rooms.delete(client.roomId);
      }

      return true;
   }

   public getRoomParticipants(roomId: string): Set<ClientSocket> {
      const room = this.rooms.get(roomId);

      if (!room) {
         return new Set<ClientSocket>();
      }

      return new Set(room.values());
   }

   public getParticipant(
     roomId: string,
     participantId: string,
   ): ClientSocket | undefined {
      return this.rooms
        .get(roomId)
        ?.get(participantId);
   }
}

export const ROOM_MANAGER = new RoomManager();
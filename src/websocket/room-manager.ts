import { ClientSocket } from '../@interfaces';

export class RoomManager {
   private rooms = new Map<string, Set<ClientSocket>>();

   public join(client: ClientSocket): void {
      const roomId = client.roomId;

      if (!this.rooms.has(roomId)) {
         this.rooms.set(roomId, new Set());
      }

      const roomSet = this.rooms.get(roomId);
      if (roomSet) {
         roomSet.add(client);
      }
   }

   public leave(client: ClientSocket): void {
      const room = this.rooms.get(client.roomId);

      if (!room) { return; }

      room.delete(client);

      if (room.size === 0) {
         this.rooms.delete(client.roomId);
      }
   }

   public getRoomParticipants(roomId: string): Set<ClientSocket> {
      return this.rooms.get(roomId) ?? new Set<ClientSocket>();
   }
}

export const ROOM_MANAGER = new RoomManager();
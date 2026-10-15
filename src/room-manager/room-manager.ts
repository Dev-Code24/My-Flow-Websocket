import { ClientSocket, ParticipantDetails } from '../interfaces';
import { REDIS_CLIENT } from '../redis';
import { getRoomParticipantsKey, getRoomStateTtlSeconds } from '../utils';

import {
   GET_ROOM_PARTICIPANTS_SCRIPT,
   JOIN_ROOM_PARTICIPANT_SCRIPT,
   KEEP_ALIVE_ROOM_PARTICIPANT_SCRIPT,
   LEAVE_ROOM_PARTICIPANT_SCRIPT,
} from '../repository/scripts';

const PRESENCE_TTL_MS = 30_000;

export class RoomManager {
   private rooms = new Map<string, Map<string, ClientSocket>>();

   public async join(client: ClientSocket): Promise<boolean> {
      const isNewParticipant = await this.joinGlobalRoom(client);

      this.joinLocalRoom(client);

      return isNewParticipant;
   }

   public async leave(client: ClientSocket): Promise<boolean> {
      this.leaveLocalRoom(client);
      return this.leaveGlobalRoom(client);
   }

   public async keepAlive(client: ClientSocket): Promise<boolean> {
      const participantsKey = getRoomParticipantsKey(client.roomId);

      const result = await REDIS_CLIENT.eval(
          KEEP_ALIVE_ROOM_PARTICIPANT_SCRIPT,
          {
             keys: [
                participantsKey,
             ],
             arguments: [
                client.participantId,
                client.connectionId,
                String(
                  PRESENCE_TTL_MS,
                ),
                String(
                  getRoomStateTtlSeconds(),
                ),
             ],
          },
        ) as number;

      return result === 1;
   }

   public async getGlobalParticipants(roomId: string): Promise<ParticipantDetails[]> {
      const participantsKey = getRoomParticipantsKey(roomId);

      const result = await REDIS_CLIENT.eval(
          GET_ROOM_PARTICIPANTS_SCRIPT,
          {
             keys: [
                participantsKey,
             ],
             arguments: [],
          },
        ) as string[];

      const participants: ParticipantDetails[] = [];

      for (let index = 0; index < result.length; index += 2) {
         const participantId = result[index];
         const displayName = result[index + 1];

         if (!participantId || !displayName) {
            continue;
         }

         participants.push({
            participantId,
            displayName,
         });
      }

      return participants;
   }

   public getRoomParticipants(roomId: string): Set<ClientSocket> {
      const room = this.rooms.get(roomId);

      if (!room) {
         return new Set();
      }

      return new Set(room.values());
   }

   public getParticipant(
     roomId: string,
     participantId: string,
   ): ClientSocket | undefined {
      return this.rooms.get(roomId)?.get(participantId);
   }

   private joinLocalRoom(client: ClientSocket): void {
      const {roomId, participantId } = client;

      if (!this.rooms.has(roomId)) {
         this.rooms.set(roomId, new Map());
      }

      const room = this.rooms.get(roomId);

      if (!room) {
         return;
      }

      const existingClient = room.get(participantId);

      room.set(participantId, client);

      if (existingClient && existingClient !== client) {
         existingClient.close();
      }
   }

   private leaveLocalRoom(client: ClientSocket): boolean {
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

   private async joinGlobalRoom(client: ClientSocket): Promise<boolean> {
      const participantsKey = getRoomParticipantsKey(client.roomId);

      const result = await REDIS_CLIENT.eval(
          JOIN_ROOM_PARTICIPANT_SCRIPT,
          {
             keys: [
                participantsKey,
             ],
             arguments: [
                client.participantId,
                client.displayName,
                client.connectionId,
                String(PRESENCE_TTL_MS),
                String(getRoomStateTtlSeconds()),
             ],
          },
        ) as number;

      return result === 1;
   }

   private async leaveGlobalRoom(client: ClientSocket): Promise<boolean> {
      const participantsKey = getRoomParticipantsKey(client.roomId);

      const result = await REDIS_CLIENT.eval(
          LEAVE_ROOM_PARTICIPANT_SCRIPT,
          {
             keys: [
                participantsKey,
             ],
             arguments: [
                client.participantId,
                client.connectionId,
             ],
          },
        ) as number;

      return result === 1;
   }
}

export const ROOM_MANAGER = new RoomManager();
import { setInterval } from "node:timers";
import { ROOM_MANAGER } from "../room-manager";
import { publishRoomMessage } from "../redis";
import { ParticipantDetails, WsMessage, WsMessageType } from "../interfaces";
import { broadcastToRoom, buildUserLeftResponse } from "../utils";

const PRESENCE_SWEEP_INTERVAL_MS = 10_000;

let isSweeping = false;

export function startPresenceSweeper() {
  setInterval(() => {
    if (isSweeping) {
      return;
    }

    isSweeping = true;

    void sweepPresence().catch((error) => {
      console.error('Failed to sweep expired room presence', error);
    }).finally(() => {
      isSweeping = false;
    });
  }, PRESENCE_SWEEP_INTERVAL_MS);
}

async function sweepPresence(): Promise<void> {
  const roomIds = ROOM_MANAGER.getLocalRoomIds();

  for (const roomId of roomIds) {
    const expiredParticipants = await ROOM_MANAGER.removeExpiredParticipants(roomId);

    for (const participant of expiredParticipants) {
      await handleExpiredParticipant(roomId, participant);
    }
  }
}

async function handleExpiredParticipant(roomId: string, participant: ParticipantDetails): Promise<void> {
  const userLeftMessage: WsMessage<WsMessageType.USER_LEFT> = buildUserLeftResponse(participant.participantId, participant.displayName);

  try {
    await publishRoomMessage<WsMessageType.USER_LEFT>(roomId, userLeftMessage);
  } catch (error) {
    console.error(`Failed to publish expired USER_LEFT for room ${roomId}`, error);
  }

  broadcastToRoom<WsMessage<WsMessageType.USER_LEFT>>(roomId, userLeftMessage);
}
import { WsMessage, WsMessageType } from "../interfaces";
import { REDIS_CLIENT, REDIS_SUBSCRIBER } from "./client";
import { broadcastToRoom } from "../utils";
import { WS_INSTANCE_ID } from "../runtime";

const subscribedRooms = new Set<string>();

interface RoomPubSubEvent<T extends WsMessageType = WsMessageType> {
  originInstanceId: string;
  message: WsMessage<T>;
}

function getRoomChannel(roomId: string): string {
  return `myflow:room:{${roomId}}:ws-events`;
}

function handleRoomMessage(roomId: string, rawMessage: string): void {
  let event: RoomPubSubEvent;

  try {
    event = JSON.parse(rawMessage) as RoomPubSubEvent;
  } catch (error) {
    console.error(`Failed to parse Redis room event for ${roomId}`, error);

    return;
  }

  if (event.originInstanceId === WS_INSTANCE_ID) {
    return;
  }

  broadcastToRoom<WsMessage>(roomId, event.message);
}

export async function publishRoomMessage<T extends WsMessageType>(
  roomId: string,
  message: WsMessage<T>,
): Promise<void> {
  const event: RoomPubSubEvent<T> = {
    originInstanceId: WS_INSTANCE_ID,
    message,
  };

  await REDIS_CLIENT.publish(getRoomChannel(roomId), JSON.stringify(event));
}

export async function subscribeToRoom(roomId: string): Promise<void> {
  if (subscribedRooms.has(roomId)) {
    return;
  }

  subscribedRooms.add(roomId);

  try {
    await REDIS_SUBSCRIBER.subscribe(
      getRoomChannel(roomId),
      (rawMessage) => {
        handleRoomMessage(roomId, rawMessage);
      }
    );
  } catch (error) {
    subscribedRooms.delete(roomId);
    throw error;
  }
}

export async function unsubscribeToRoom(roomId: string): Promise<void> {
  if (!subscribedRooms.has(roomId)) {
    return;
  }

  await REDIS_SUBSCRIBER.unsubscribe(roomId);

  subscribedRooms.delete(roomId);
}


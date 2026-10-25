import { WsMessage, WsMessageType } from "../interfaces";
import { REDIS_CLIENT, REDIS_SUBSCRIBER } from "./client";
import { broadcastToRoom } from "../utils";
import { WS_INSTANCE_ID } from "../runtime";

interface RoomPubSubEvent<T extends WsMessageType = WsMessageType> {
  originInstanceId: string;
  message: WsMessage<T>;
}

const subscribedRooms = new Set<string>();
const roomSubscriptionQueues = new Map<string, Promise<void>>();

function enqueueRoomSubscriptionOperation(
  roomId: string,
  operation: () => Promise<void>,
): Promise<void> {
  const previous = roomSubscriptionQueues.get(roomId) ?? Promise.resolve();
  const next = previous.catch(() => {}).then(operation);

  roomSubscriptionQueues.set(roomId, next);

  void next.finally(() => {
    if (roomSubscriptionQueues.get(roomId) === next) {
      roomSubscriptionQueues.delete(roomId);
    }
  });

  return next;
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

export function subscribeToRoom(roomId: string): Promise<void> {
  return enqueueRoomSubscriptionOperation(roomId, async () => {
      if (subscribedRooms.has(roomId)) {
        return;
      }

      await REDIS_SUBSCRIBER.subscribe(getRoomChannel(roomId), (message) => {
          handleRoomMessage(roomId, message);
        },
      );

      subscribedRooms.add(roomId);
    },
  );
}

export function unsubscribeFromRoom(roomId: string): Promise<void> {
  return enqueueRoomSubscriptionOperation(roomId, async () => {
      if (!subscribedRooms.has(roomId)) {
        return;
      }

      await REDIS_SUBSCRIBER.unsubscribe(getRoomChannel(roomId));

      subscribedRooms.delete(roomId);
    },
  );
}

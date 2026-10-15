import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error('REDIS_URL is required');
}

export const REDIS_CLIENT = createClient({
  url: redisUrl,
});

export const REDIS_SUBSCRIBER = REDIS_CLIENT.duplicate();

REDIS_CLIENT.on('error', (error) => {
  console.error('Redis error:', error);
});

REDIS_SUBSCRIBER.on('error', (error) => {
  console.error('Redis subscriber error:', error);
});

export async function connectRedis(): Promise<void> {
  const connections: Promise<unknown>[] = [];

  if (!REDIS_CLIENT.isOpen) {
    connections.push(REDIS_CLIENT.connect());
  }

  if (!REDIS_SUBSCRIBER.isOpen) {
    connections.push(REDIS_SUBSCRIBER.connect());
  }

  await Promise.all(connections);

  console.log('Connected to REDIS ✅');
}
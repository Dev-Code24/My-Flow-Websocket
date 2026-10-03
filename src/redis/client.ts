import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error('REDIS_URL is required');
}

export const REDIS_CLIENT = createClient({
  url: redisUrl,
});

REDIS_CLIENT.on('error', (error) => {
  console.error('Redis error:', error);
});

export async function connectRedis(): Promise<void> {
  if (REDIS_CLIENT.isOpen) {
    return;
  }

  await REDIS_CLIENT.connect();

  console.log('Connected to Redis');
}
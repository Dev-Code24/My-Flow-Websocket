local cursor = tonumber(redis.call('HGET', KEYS[1], 'cursor') or '0')
local historyVersion = tonumber(redis.call('HGET', KEYS[1], 'historyVersion') or '0')
local historyLength = redis.call('LLEN', KEYS[2])

return {
    cursor,
    historyVersion,
    historyLength
}
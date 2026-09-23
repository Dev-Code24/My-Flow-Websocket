local metaKey = KEYS[1]
local entriesKey = KEYS[2]
local historySeenEntryIdsKey = KEYS[3]
local yjsUpdatesKey = KEYS[4]
local yjsSeenUpdateIdsKey = KEYS[5]

local expectedVersion = tonumber(ARGV[1])
local expectedCursor = tonumber(ARGV[2])
local updateId = ARGV[3]
local update = ARGV[4]
local ttlSeconds = tonumber(ARGV[5])

local currentCursor = tonumber(redis.call('HGET', metaKey, 'cursor') or '0')
local currentVersion = tonumber(redis.call('HGET', metaKey, 'historyVersion') or '0')
local historyLength = redis.call('LLEN', entriesKey)
local existingStreamId = redis.call('HGET', yjsSeenUpdateIdsKey, updateId)

if existingStreamId then
    redis.call('EXPIRE', metaKey, ttlSeconds)
    redis.call('EXPIRE', entriesKey, ttlSeconds)
    redis.call('EXPIRE', historySeenEntryIdsKey, ttlSeconds)
    redis.call('EXPIRE', yjsUpdatesKey, ttlSeconds)
    redis.call('EXPIRE', yjsSeenUpdateIdsKey, ttlSeconds)

    return {
        2,
        currentCursor,
        currentVersion,
        historyLength,
        existingStreamId
    }
end

if currentVersion ~= expectedVersion or currentCursor ~= expectedCursor then
    return {
        0,
        currentCursor,
        currentVersion,
        historyLength,
        ''
    }
end

if currentCursor <= 0 then
    return {
        3,
        currentCursor,
        currentVersion,
        historyLength,
        ''
    }
end

local streamId = redis.call('XADD', yjsUpdatesKey, '*', 'updateId', updateId, 'update', update)
redis.call('HSET', yjsSeenUpdateIdsKey, updateId, streamId)

local newCursor = currentCursor - 1
local newVersion = currentVersion + 1

redis.call('HSET', metaKey, 'cursor', newCursor, 'historyVersion', newVersion)
redis.call('EXPIRE', metaKey, ttlSeconds)
redis.call('EXPIRE', entriesKey, ttlSeconds)
redis.call('EXPIRE', historySeenEntryIdsKey, ttlSeconds)
redis.call('EXPIRE', yjsUpdatesKey, ttlSeconds)
redis.call('EXPIRE', yjsSeenUpdateIdsKey, ttlSeconds)

return {
    1,
    newCursor,
    newVersion,
    historyLength,
    streamId
}
local updatesKey = KEYS[1]
local seenUpdateIdsKey = KEYS[2]
local expectedTail = ARGV[1]
local updateId = ARGV[2]
local update = ARGV[3]
local ttlSeconds = tonumber(ARGV[4])
local existingStreamId =redis.call('HGET', seenUpdateIdsKey, updateId)

if existingStreamId then
    if ttlSeconds > 0 then
        redis.call('EXPIRE', updatesKey, ttlSeconds)
        redis.call('EXPIRE', seenUpdateIdsKey, ttlSeconds)
    end

    return {
        2,
        existingStreamId
    }
end

local latestEntries = redis.call('XREVRANGE', updatesKey, '+', '-', 'COUNT', 1)
local currentTail = ''

if #latestEntries > 0 then
    currentTail = latestEntries[1][1]
end

if currentTail ~= expectedTail then
    return {
        0,
        currentTail
    }
end

local streamId = redis.call('XADD', updatesKey, '*', 'updateId', updateId, 'update', update)

redis.call('HSET', seenUpdateIdsKey, updateId, streamId)

if ttlSeconds > 0 then
    redis.call('EXPIRE', updatesKey, ttlSeconds)
    redis.call('EXPIRE', seenUpdateIdsKey, ttlSeconds)
end

return {
    1,
    streamId
}
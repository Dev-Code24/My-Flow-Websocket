local updatesKey = KEYS[1]
local seenUpdateIdsKey = KEYS[2]

local updateId = ARGV[1]
local update = ARGV[2]
local ttlSeconds = tonumber(ARGV[3])

local existingStreamId =
redis.call('HGET', seenUpdateIdsKey, updateId)

if existingStreamId then
    if ttlSeconds > 0 then
        redis.call('EXPIRE', updatesKey, ttlSeconds)
        redis.call('EXPIRE', seenUpdateIdsKey, ttlSeconds)
    end

    return {
        0,
        existingStreamId
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
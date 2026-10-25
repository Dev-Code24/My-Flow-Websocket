local locksKey = KEYS[1]
local participantId = ARGV[1]
local interactionId = ARGV[2]
local lockTtlMillis = tonumber(ARGV[3])
local roomTtlSeconds = tonumber(ARGV[4])
local redisTime = redis.call('TIME')
local nowMillis = (tonumber(redisTime[1]) * 1000) + math.floor(tonumber(redisTime[2]) / 1000)

local expiresAt = nowMillis + lockTtlMillis

for i = 5, #ARGV do
    local elementId = ARGV[i]

    local existingValue =
    redis.call('HGET', locksKey, elementId)

    if not existingValue then
        return 0
    end

    local existingLock =
    cjson.decode(existingValue)

    if
    existingLock.participantId ~= participantId
            or
            existingLock.interactionId ~= interactionId
            or
            tonumber(existingLock.expiresAt) <= nowMillis
    then
        return 0
    end
end

for i = 5, #ARGV do
    local elementId = ARGV[i]

    redis.call(
        'HSET',
        locksKey,
        elementId,
        cjson.encode({
            participantId = participantId,
            interactionId = interactionId,
            expiresAt = expiresAt
        })
    )
end

redis.call('EXPIRE', locksKey, roomTtlSeconds)

return 1
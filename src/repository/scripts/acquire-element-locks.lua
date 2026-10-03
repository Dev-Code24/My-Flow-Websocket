local locksKey = KEYS[1]
local participantId = ARGV[1]
local interactionId = ARGV[2]
local lockTtlMillis = tonumber(ARGV[3])
local roomTtlSeconds = tonumber(ARGV[4])
local redisTime = redis.call('TIME')
local nowMillis = (tonumber(redisTime[1]) * 1000) + math.floor(tonumber(redisTime[2]) / 1000)

local expiresAt = nowMillis + lockTtlMillis
local lockedElementIds = {}

for i = 5, #ARGV do
    local elementId = ARGV[i]
    local existingValue = redis.call('HGET', locksKey, elementId)

    if existingValue then
        local existingLock = cjson.decode(existingValue)
        local isExpired = tonumber(existingLock.expiresAt) <= nowMillis
        local belongsToCurrentInteraction = existingLock.participantId == participantId and existingLock.interactionId == interactionId

        if
        not isExpired
                and
                not belongsToCurrentInteraction
        then
            table.insert(
                lockedElementIds,
                elementId
            )
        end
    end
end

if #lockedElementIds > 0 then
    return {
        0,
        cjson.encode(lockedElementIds)
    }
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

redis.call(
    'EXPIRE',
    locksKey,
    roomTtlSeconds
)

return {
    1,
    tostring(expiresAt)
}
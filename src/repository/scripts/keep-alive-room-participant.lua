local participantsKey = KEYS[1]
local participantId = ARGV[1]
local connectionId = ARGV[2]
local presenceTtlMs = tonumber(ARGV[3])
local roomTtlSeconds = tonumber(ARGV[4])
local existingJson = redis.call('HGET', participantsKey, participantId)

if not existingJson then
    return 0
end

local participant = cjson.decode(existingJson)

if participant.connectionId
        ~= connectionId then
    return 0
end

local currentTime = redis.call('TIME')
local now = tonumber(currentTime[1]) * 1000 + math.floor(tonumber(currentTime[2]) / 1000)

participant.expiresAt = now + presenceTtlMs

redis.call('HSET', participantsKey, participantId, cjson.encode(participant))

if roomTtlSeconds > 0 then
    redis.call('EXPIRE', participantsKey, roomTtlSeconds)
end

return 1
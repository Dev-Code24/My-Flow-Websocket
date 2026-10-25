local participantsKey = KEYS[1]
local participantId = ARGV[1]
local displayName = ARGV[2]
local connectionId = ARGV[3]
local presenceTtlMs = tonumber(ARGV[4])
local roomTtlSeconds = tonumber(ARGV[5])
local currentTime = redis.call('TIME')
local now = tonumber(currentTime[1]) * 1000 + math.floor(tonumber(currentTime[2]) / 1000)
local existingJson =redis.call('HGET', participantsKey, participantId)
local wasPresent = false

if existingJson then
    local existing = cjson.decode(existingJson)

    if existing.expiresAt
            and existing.expiresAt > now then
        wasPresent = true
    end
end

local participant = {
    displayName = displayName,
    connectionId = connectionId,
    expiresAt = now + presenceTtlMs
}

redis.call('HSET', participantsKey, participantId, cjson.encode(participant))

if roomTtlSeconds > 0 then
    redis.call('EXPIRE', participantsKey, roomTtlSeconds)
end

if wasPresent then
    return 0
end

return 1
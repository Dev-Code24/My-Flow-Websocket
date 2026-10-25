local participantsKey = KEYS[1]
local participantId = ARGV[1]
local connectionId = ARGV[2]
local existingJson = redis.call('HGET', participantsKey, participantId)

if not existingJson then
    return 0
end

local participant = cjson.decode(existingJson)

if participant.connectionId
        ~= connectionId then
    return 0
end

redis.call('HDEL', participantsKey, participantId)

return 1
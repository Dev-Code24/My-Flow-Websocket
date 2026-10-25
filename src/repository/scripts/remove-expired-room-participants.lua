local participantsKey = KEYS[1]
local currentTime = redis.call('TIME')
local now = tonumber(currentTIme[1]) * 1000 + math.floor(tonumber(currentTime[2]) / 1000)
local entries = redis.call('HGETALL', participantsKey)
local expiredParticipants = {}

for index = 1, #entries, 2 do
    local participantId = entries[index]
    local participantsJson = entries[index + 1]
    local participant = cjson.decode(participantsJson)

    if participant.expiresAt and participant.expiresAt <= now then
        redis.call('HDEL', participantsKey, participantId)
        table.insert(expiredParticipants, participantId)
        table.insert(expiredParticipants, participant.displayName)
    end
end

return expiredParticipants
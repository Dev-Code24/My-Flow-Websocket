local participantsKey = KEYS[1]
local currentTime = redis.call('TIME')
local now = tonumber(currentTime[1]) * 1000 + math.floor(tonumber(currentTime[2]) / 1000)
local entries = redis.call('HGETALL', participantsKey)
local result = {}

for index = 1, #entries, 2 do
    local participantId = entries[index]
    local participantJson = entries[index + 1]
    local participant = cjson.decode(participantJson)

    if participant.expiresAt and participant.expiresAt > now then
        table.insert(result, participantId)
        table.insert(result, participant.displayName)
    end
end

return result
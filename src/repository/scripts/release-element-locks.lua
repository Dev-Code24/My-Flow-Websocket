local locksKey = KEYS[1]
local participantId = ARGV[1]
local interactionId = ARGV[2]
local released = 0

for i = 3, #ARGV do
    local elementId = ARGV[i]
    local existingValue = redis.call('HGET', locksKey, elementId)

    if existingValue then
        local existingLock = cjson.decode(existingValue)

        if
        existingLock.participantId == participantId and existingLock.interactionId == interactionId
        then
            redis.call('HDEL', locksKey, elementId)
            released = released + 1
        end
    end
end

return released
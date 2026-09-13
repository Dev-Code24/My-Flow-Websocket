local entriesKey = KEYS[1]
local metaKey = KEYS[2]
local seenEntryIdsKey = KEYS[3]

local entryId = ARGV[1]
local entryJson = ARGV[2]
local maxHistoryEntries = tonumber(ARGV[3])
local ttlSeconds = tonumber(ARGV[4])

local cursor = tonumber(redis.call('HGET', metaKey, 'cursor') or '0')
local historyVersion = tonumber(redis.call('HGET', metaKey, 'historyVersion') or '0')
local historyLength = redis.call('LLEN', entriesKey)

if redis.call('SISMEMBER', seenEntryIdsKey, entryId) == 1 then
    return {
        0,
        cursor,
        historyVersion,
        historyLength
    }
end

if cursor < historyLength then
    if cursor == 0 then
        redis.call(
            'DEL',
            entriesKey
        )
    else
        redis.call(
            'LTRIM',
            entriesKey,
            0,
            cursor - 1
        )
    end
end

redis.call('RPUSH', entriesKey, entryJson)

redis.call('SADD', seenEntryIdsKey, entryId)

historyLength = redis.call('LLEN', entriesKey)

if historyLength > maxHistoryEntries then
    local overflow =
    historyLength - maxHistoryEntries

    redis.call(
        'LTRIM',
        entriesKey,
        overflow,
        -1
    )

    historyLength = maxHistoryEntries
end

cursor = historyLength
historyVersion = historyVersion + 1

redis.call('HSET', metaKey, 'cursor', cursor, 'historyVersion', historyVersion)

if ttlSeconds > 0 then
    redis.call(
        'EXPIRE',
        entriesKey,
        ttlSeconds
    )

    redis.call(
        'EXPIRE',
        metaKey,
        ttlSeconds
    )

    redis.call(
        'EXPIRE',
        seenEntryIdsKey,
        ttlSeconds
    )
end

return {
    1,
    cursor,
    historyVersion,
    historyLength
}
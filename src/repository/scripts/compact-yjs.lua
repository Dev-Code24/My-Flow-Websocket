local snapshotKey = KEYS[1]
local updatesKey = KEYS[2]
local seenUpdateIdsKey = KEYS[3]
local expectedSnapshotWatermark = ARGV[1]
local newSnapshotWatermark = ARGV[2]
local snapshotUpdate = ARGV[3]
local ttlSeconds = tonumber(ARGV[4])
local currentSnapshotWatermark = redis.call('HGET', snapshotKey, 'watermark')

if not currentSnapshotWatermark then
    currentSnapshotWatermark = ''
end

if currentSnapshotWatermark ~= expectedSnapshotWatermark then
    return 0
end

redis.call('HSET', snapshotKey, 'update', snapshotUpdate, 'watermark', newSnapshotWatermark)
redis.call('XTRIM', updatesKey, 'MINID', newSnapshotWatermark)

if ttlSeconds > 0 then
    redis.call('EXPIRE', snapshotKey, ttlSeconds)
    redis.call('EXPIRE', updatesKey, ttlSeconds)
    redis.call('EXPIRE', seenUpdateIdsKey, ttlSeconds)
end

return 1
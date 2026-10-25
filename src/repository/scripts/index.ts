import { readFileSync } from 'fs';
import path from 'path';

function loadLuaScript(...pathSegments: string[]): string {
  return readFileSync(
    path.join(__dirname, ...pathSegments),
    'utf-8',
  );
}

export const APPEND_HISTORY_ENTRY_SCRIPT = loadLuaScript('append-history-entry.lua');
export const GET_HISTORY_STATE_SCRIPT = loadLuaScript('get-history-state.lua');
export const APPEND_YJS_UPDATE_SCRIPT = loadLuaScript('append-yjs-update.lua');
export const COMMIT_UNDO_SCRIPT = loadLuaScript('commit-undo.lua');
export const ACQUIRE_ELEMENT_LOCKS_SCRIPT = loadLuaScript('acquire-element-locks.lua');
export const RELEASE_ELEMENT_LOCKS_SCRIPT = loadLuaScript('release-element-locks.lua');
export const RENEW_ELEMENT_LOCKS_SCRIPT = loadLuaScript('renew-element-locks.lua');
export const COMMIT_REDO_SCRIPT = loadLuaScript('commit-redo.lua');
export const COMPACT_YJS_SCRIPT = loadLuaScript('compact-yjs.lua');
export const APPEND_YJS_UPDATE_IF_TAIL_MATCHES_SCRIPT = loadLuaScript('append-yjs-update-if-tail-matches.lua');
export const JOIN_ROOM_PARTICIPANT_SCRIPT = loadLuaScript('join-room-participant.lua');
export const KEEP_ALIVE_ROOM_PARTICIPANT_SCRIPT = loadLuaScript('keep-alive-room-participant.lua');
export const LEAVE_ROOM_PARTICIPANT_SCRIPT = loadLuaScript('leave-room-participant.lua');
export const GET_ROOM_PARTICIPANTS_SCRIPT = loadLuaScript('get-room-participants.lua');
export const REMOVE_EXPIRED_ROOM_PARTICIPANTS_SCRIPT = loadLuaScript('remove-expired-room-participants.lua');
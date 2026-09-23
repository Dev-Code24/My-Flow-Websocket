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
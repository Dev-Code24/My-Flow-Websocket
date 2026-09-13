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
import http from 'http';
import WebSocket from 'ws';
import { JwtPayload } from 'jsonwebtoken';
import { HistoryEntryDraft, RoomHistoryState } from './history.interfaces';

interface YjsUpdatePayload {
  updateId: string;
  update: string;
}

export interface ClientSocket extends WebSocket {
  roomId: string;
  participantId: string;
  displayName: string;
}

export interface WsTokenPayload extends JwtPayload {
  roomId: string;
  participantId: string;
  displayName: string;
}

export interface WsRequest extends http.IncomingMessage {
  participant: WsTokenPayload;
}

export interface HistoryNavigationRequest {
  requestId: string;
  expectedVersion: number;
}

export interface EditBeginRequest {
  editId: string;
  elementIds: string[];
}

export interface EditAccepted {
  editId: string;
}

export interface EditRejected {
  editId: string;
}

export interface EditKeepAlive {
  editId: string;
  elementIds: string[];
}

export interface EditEndRequest {
  editId: string;
  elementIds: string[];
}

export enum WsMessageType {
  CONNECTION_ESTABLISHED = 'CONNECTION_ESTABLISHED',
  USER_JOINED = 'USER_JOINED',
  USER_LEFT = 'USER_LEFT',
  ROOM_STATE = 'ROOM_STATE',
  YJS_SYNC_REQUEST = 'YJS_SYNC_REQUEST',
  YJS_SYNC_STEP_1 = 'YJS_SYNC_STEP_1',
  YJS_SYNC_STEP_2 = 'YJS_SYNC_STEP_2',
  YJS_UPDATE = 'YJS_UPDATE',
  HISTORY_ENTRY_COMMIT = 'HISTORY_ENTRY_COMMIT',
  ROOM_HISTORY_STATE = 'ROOM_HISTORY_STATE',
  UNDO_REQUEST = 'UNDO_REQUEST',
  EDIT_BEGIN = 'EDIT_BEGIN',
  EDIT_ACCEPTED = 'EDIT_ACCEPTED',
  EDIT_REJECTED = 'EDIT_REJECTED',
  EDIT_KEEP_ALIVE = 'EDIT_KEEP_ALIVE',
  EDIT_END = 'EDIT_END',
}

export interface ParticipantDetails {
   participantId: string;
   displayName: string;
}

export type MessageMap = {
  [WsMessageType.CONNECTION_ESTABLISHED]: {
    participantId: string;
    roomId: string;
    displayName: string;
    syncRequired: boolean;
  };
   [WsMessageType.USER_JOINED]: ParticipantDetails;
   [WsMessageType.USER_LEFT]: ParticipantDetails;
   [WsMessageType.ROOM_STATE]: {
      participants: ParticipantDetails[];
   };
  [WsMessageType.YJS_SYNC_REQUEST]: {
    peerParticipantId: string;
  };
  [WsMessageType.YJS_SYNC_STEP_1]: {
    peerParticipantId: string;
    stateVector: string;
  };
  [WsMessageType.YJS_SYNC_STEP_2]: YjsUpdatePayload
  [WsMessageType.YJS_UPDATE]: YjsUpdatePayload
  [WsMessageType.HISTORY_ENTRY_COMMIT]: HistoryEntryDraft;
  [WsMessageType.ROOM_HISTORY_STATE]: RoomHistoryState;
  [WsMessageType.UNDO_REQUEST]: HistoryNavigationRequest;
  [WsMessageType.EDIT_BEGIN]: EditBeginRequest;
  [WsMessageType.EDIT_ACCEPTED]: EditAccepted;
  [WsMessageType.EDIT_REJECTED]: EditRejected;
  [WsMessageType.EDIT_KEEP_ALIVE]: EditKeepAlive;
  [WsMessageType.EDIT_END]: EditEndRequest;
};

export type WsMessage<T extends WsMessageType = WsMessageType> = {
   [K in T]: {
      type: K;
      message: MessageMap[K];
   };
}[T];

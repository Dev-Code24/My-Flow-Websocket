import http from 'http';
import { JwtPayload } from 'jsonwebtoken';
import WebSocket from 'ws';

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

export enum WsMessageType {
   CONNECTION_ESTABLISHED = 'CONNECTION_ESTABLISHED',
   USER_JOINED = 'USER_JOINED',
   USER_LEFT = 'USER_LEFT',
   ROOM_STATE = 'ROOM_STATE',
   YJS_UPDATE = 'YJS_UPDATE',
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
   };
   [WsMessageType.USER_JOINED]: ParticipantDetails;
   [WsMessageType.USER_LEFT]: ParticipantDetails;
   [WsMessageType.ROOM_STATE]: {
      participants: ParticipantDetails[];
   };
  [WsMessageType.YJS_UPDATE]: {
    update: string;
  };
};

export type WsMessage<T extends WsMessageType = WsMessageType> = {
   [K in T]: {
      type: K;
      message: MessageMap[K];
   };
}[T];

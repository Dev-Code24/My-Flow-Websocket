import jwt from 'jsonwebtoken';
import { WsTokenPayload } from '../../@interfaces';

export function verifyWsToken(token: string): WsTokenPayload {
   try {
      const secret = process.env.JWT_SECRET;
      return jwt.verify(token, Buffer.from(secret, 'base64')) as WsTokenPayload;
   } catch (error) {
      console.error("Something wrong with WS token", error);
      throw error;
   }
}
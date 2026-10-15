import { WebSocketServer } from 'ws';
import { ClientSocket, WsRequest } from '../interfaces';
import { handleConnectionOpen } from '../utils';
import { handleWebSocketMessage } from '../utils';

export const wss = new WebSocketServer({ noServer: true });

wss.on('connection', async (ws, req) => {
   const client = ws as ClientSocket;

   await handleConnectionOpen(req as WsRequest, client);

   let messageProcessingQueue = Promise.resolve();

   client.on('message', (data) => {
      messageProcessingQueue = messageProcessingQueue
        .then(() => {
          return handleWebSocketMessage(client, data);
        })
        .catch((error) => {
          console.error(`Failed to process websocket message for ${client.participantId}`, error);
        });
   });
});

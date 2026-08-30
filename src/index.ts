import http from "http";
import app  from "./app";
import { wss } from "./websocket/server";
import { verifyWsToken } from "./websocket/tokens";
import { checkForEnvVariables } from "./utils";
import { WsRequest } from "./@interfaces";

checkForEnvVariables();

const PORT = process.env.PORT;
const server = http.createServer(app);

server.listen(PORT, () => { 
   console.log('Server is running on port', PORT);
});

server.on('upgrade', (req, socket, head) => {
   const url = new URL(req.url!, process.env.BASE_URL);
   const token = url.searchParams.get('token');

   if (!token) {
      console.error('NO TOKEN IN THE REQUEST. DESTROYING THE SOCKET.');
      socket.destroy();
      return;
   }

   try {
      const payload = verifyWsToken(token);
      (req as WsRequest).participant = payload;
   
      wss.handleUpgrade(req, socket, head, (ws) => {
         wss.emit("connection", ws, req);
      })
   } catch (error) {
      console.error('Something went wrong while connection upgrade.', error);
      socket.destroy();
   }
});

export default server;
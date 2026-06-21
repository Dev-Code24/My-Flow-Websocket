export function checkForEnvVariables() {
   const { BASE_URL, FRONT_END_URL, JWT_SECRET, PORT } = process.env;
   const object: Record<string, string | number> = {
      BASE_URL,
      FRONT_END_URL,
      JWT_SECRET,
      PORT
   };
   Object.entries(object).forEach(([key, val]) => {
      if (!val) {
         throw Error(`ENV VARIABLE ${key} is missing. Add ${key}`);
      }
   });
}

export * from './websocket.utils';
export * from './broadcast.utils';
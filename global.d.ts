declare namespace NodeJS {
   interface ProcessEnv {
      JWT_SECRET: string;
      PORT: number;
      FRONT_END_URL: string;
      BASE_URL: string;
      NODE_ENV: 'prod' | 'dev';
   }
}
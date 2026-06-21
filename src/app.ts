import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';

// CONFIGURATION
dotenv.config({
   path: `.env.${process.env.NODE_ENV}`
});
const app = express();
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: 'cross-origin'}))
app.use(morgan("common"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors({
   credentials: true,
   origin: process.env.FRONT_END_URL,
}));
app.use(cookieParser());


export default app;
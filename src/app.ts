import express from 'express';
import webRouter from './routes/web.route';
import apiRouter from './routes/api.route';
import path from 'node:path';
import expressLayouts from 'express-ejs-layouts';
import helmet from 'helmet';
import { errorHandler } from './middleware/error-handler';
import { notFoundHandler } from './middleware/not-found-handler';
import { appVersion } from './config/app-info';
import { viewHelpers } from './middleware/view-helper';
import cookieParser from 'cookie-parser';
import { getViteAssets } from './shared/utils/vite';

const app = express();

app.locals.appVersion = appVersion;
const isDevelopment = process.env.NODE_ENV === 'development';
app.locals.appVersion = appVersion;

app.locals.isDevelopment = isDevelopment;

app.locals.viteAssets = {
  js: '',
  css: [],
};

if (!isDevelopment) {
  app.locals.viteAssets = getViteAssets();
}

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],

        scriptSrc: ["'self'", "'unsafe-eval'", ...(isDevelopment ? ['http://localhost:5173'] : [])],

        styleSrc: ["'self'", "'unsafe-inline'", ...(isDevelopment ? ['http://localhost:5173'] : [])],

        connectSrc: ["'self'", ...(isDevelopment ? ['http://localhost:5173', 'ws://localhost:5173'] : [])],
      },
    },
  })
);
app.use(express.json());
app.use(cookieParser());

// Gunnakan views engine dari ejs
app.set('view engine', 'ejs');
app.set('views', path.join(process.cwd(), 'src', 'views'));
app.use('/client', express.static(path.join(process.cwd(), 'dist/client')));

// Gunakan layout dari express layouts
app.use(expressLayouts);
app.set('layout', 'layouts/app');

// aktifkan static file dari public
app.use(express.static(path.join(process.cwd(), 'public')));

app.use(viewHelpers);
app.use('/api', apiRouter);
app.use(webRouter);

app.use(notFoundHandler);

app.use(errorHandler);
export default app;

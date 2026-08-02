import express from 'express';
import webRouter from './routes/web.route';
import apiRouter from './routes/api.route';
import path from 'node:path';
import expressLayouts from 'express-ejs-layouts';
import helmet from 'helmet';
import { errorHandler } from './middleware/error-handler';
import { notFoundHandler } from './middleware/not-found-handler';
import { appVersion } from './config/app-info';
import { formatLastSeen, stateLabelMap } from './shared/utils/view-helper';
import { viewHelpers } from './middleware/view-helper';
import cookieParser from 'cookie-parser';

const app = express();

app.locals.appVersion = appVersion;

app.use(helmet());
app.use(express.json());
app.use(cookieParser());

// Gunnakan views engine dari ejs
app.set('view engine', 'ejs');
app.set('views', path.join(process.cwd(), 'src', 'views'));

// Gunakan layout dari express layouts
app.use(expressLayouts);
app.set('layout', 'layouts/app');

// aktifkan static file dari public
app.use(express.static(path.join(process.cwd(), 'public')));

app.use(viewHelpers);
app.use('/api', apiRouter);
app.use((req, res, next) => {
  res.locals.formatLastSeen = formatLastSeen;
  res.locals.stateLabelMap = stateLabelMap;
  next();
});
app.use(webRouter);

app.use(notFoundHandler);

app.use(errorHandler);
export default app;

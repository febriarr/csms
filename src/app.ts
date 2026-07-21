import express from 'express';
import webRouter from './routes/web.route';
import path from 'node:path';
import expressLayouts from 'express-ejs-layouts';
import helmet from 'helmet';
import { errorHandler } from './middleware/error-handler';
import { notFoundHandler } from './middleware/not-found-handler';

const app = express();

app.use(helmet());

// Gunnakan views engine dari ejs
app.set('view engine', 'ejs');
app.set('views', path.join(process.cwd(), 'src', 'views'));

// Gunakan layout dari express layouts
app.use(expressLayouts);
app.set('layout', 'layouts/app');

// aktifkan static file dari public
app.use(express.static(path.join(process.cwd(), 'public')));

app.use(webRouter);

app.use(notFoundHandler);

app.use(errorHandler);
export default app;

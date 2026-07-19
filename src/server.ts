import app from './app.js';
import { env } from './config/env.js';

app.listen(env.port, () => {
  console.log(`${env.appName} running at http://localhost:${env.port}`);
});

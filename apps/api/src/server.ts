import { parseEnv } from '@finance/config';
import { createApp } from './app.js';

const env = parseEnv(process.env);
const app = await createApp({
  cookieName: env.COOKIE_NAME,
  isProduction: env.NODE_ENV === 'production',
  webOrigin: env.WEB_ORIGIN,
});

await app.listen({ host: '0.0.0.0', port: env.PORT });

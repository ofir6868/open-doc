import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import os from 'os';

const certDir = path.join(os.homedir(), '.office-addin-dev-certs');
const certFile = path.join(certDir, 'localhost.crt');
const keyFile = path.join(certDir, 'localhost.key');

const httpsConfig =
  fs.existsSync(certFile) && fs.existsSync(keyFile)
    ? { cert: fs.readFileSync(certFile), key: fs.readFileSync(keyFile) }
    : true;

export default defineConfig({
  root: __dirname,
  plugins: [react()],
  server: {
    port: 3001,
    https: httpsConfig,
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
  resolve: {
    alias: {
      '@open-doc/shared': path.resolve(__dirname, '../../libs/shared/src/index.ts'),
    },
  },
});

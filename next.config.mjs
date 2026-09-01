import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  allowedDevOrigins: ['127.0.0.1'],
  images: {
    unoptimized: true,
  },
  sassOptions: {
    includePaths: [
      path.join(__dirname, 'src/styles'),
      path.join(__dirname, 'node_modules'),
    ],
    silenceDeprecations: ['legacy-js-api', 'import'],
  },
  reactStrictMode: true,
};

export default nextConfig;

import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  // The design tokens and primitives are shared TypeScript source, not a built
  // package, so Next has to compile them alongside the app.
  transpilePackages: ['@sachmuch/ui', '@sachmuch/core'],
  images: {
    // Commons serves resized copies through Special:FilePath.
    remotePatterns: [{ protocol: 'https', hostname: 'commons.wikimedia.org' },
                     { protocol: 'https', hostname: 'upload.wikimedia.org' }],
  },
};

export default config;

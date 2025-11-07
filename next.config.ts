import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Removed 'output: export' to enable server-side features like:
  // - Middleware for authentication
  // - Dynamic rendering with cookies
  // - Server-side session validation
};

export default nextConfig;

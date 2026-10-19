import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,

};

module.exports = {
  allowedDevOrigins: ['192.168.12.194'],
}

export default nextConfig;

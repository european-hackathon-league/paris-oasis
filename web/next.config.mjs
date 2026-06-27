/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",      // self-contained server for Docker
  images: { unoptimized: true },  // static PNGs from /public, no optimizer needed
  reactStrictMode: true,
};

export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.reddit.com" },
      { protocol: "https", hostname: "**.redd.it" },
      { protocol: "https", hostname: "**.twimg.com" },
      { protocol: "https", hostname: "substackcdn.com" },
      { protocol: "https", hostname: "**.substack.com" },
    ],
  },
};
export default nextConfig;
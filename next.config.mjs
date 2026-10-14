/** @type {import('next').NextConfig} */
const imageDomains = [
  "picsum.photos",
  "theprivateapp.com",
  "firebasestorage.googleapis.com",
];

// Only include COMM_SERVER_ADDRESS when it is defined to satisfy Next config validation.
if (process.env.COMM_SERVER_ADDRESS) {
  imageDomains.push(process.env.COMM_SERVER_ADDRESS);
}

const nextConfig = {
  // Keep benchmark builds separate from an already running development server.
  distDir: process.env.TASKMANAGER_PERFORMANCE_BUILD_DIR || ".next",
  // Multipart headers count toward the middleware buffer limit. Documents can
  // contain 10 MiB of file data; leave room for their multipart envelope.
  experimental: { middlewareClientMaxBodySize: "11mb" },
  images: {
    domains: imageDomains,
  },
};

export default nextConfig;

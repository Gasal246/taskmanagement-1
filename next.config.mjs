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
  images: {
    domains: imageDomains,
  },
};

export default nextConfig;

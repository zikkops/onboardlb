import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.ibb.co',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Stops this site being framed by another origin (clickjacking) —
          // relevant for /admin/login and /customer/login especially.
          { key: 'X-Frame-Options', value: 'DENY' },
          // Stops the browser from MIME-sniffing a response into something
          // other than its declared Content-Type.
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Full URL (incl. query params) is sent on same-origin navigation,
          // only the origin (no path/query) leaks to a different origin.
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // This app never uses the camera, mic, or geolocation — deny all
          // three outright rather than leaving them at the browser default.
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "otmlfmgyscrohtbpqqoi.supabase.co",
        pathname: "/storage/v1/object/public/aclis-leader-photos/**",
      },
    ],
  },
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;

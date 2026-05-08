import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Allow accessing dev server from LAN devices (HMR, dev assets).
   * Add/remove IPs as needed for your WiFi network.
   */
  allowedDevOrigins: ["localhost", "127.0.0.1", "192.168.10.220"],
};

export default nextConfig;

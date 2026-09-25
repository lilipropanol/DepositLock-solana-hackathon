import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // The Anchor workspace at the repo root has its own package-lock.json, so
  // pin the frontend's root explicitly to stop Next inferring the wrong one.
  turbopack: { root: path.resolve(__dirname) },
};

export default nextConfig;

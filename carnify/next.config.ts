import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tree-shake iconos/charts: bundles mas chicos = carga mas rapida en PCs
  // de gama baja (hardware limitado del cliente final).
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },
};

export default nextConfig;

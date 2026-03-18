import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // App Router에서는 Pages Router의 404/error 충돌 방지
  experimental: {
    // xlsx가 서버에서 Html 컴포넌트를 참조하는 문제 방지
  },
  serverExternalPackages: ["xlsx"],
};

export default nextConfig;

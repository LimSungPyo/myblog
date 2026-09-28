import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // 글 카드 제목 → 글 상세 제목처럼, 이름이 같은 요소를 페이지 이동 사이에 이어 준다(React <ViewTransition>)
    viewTransition: true,
  },
};

export default nextConfig;

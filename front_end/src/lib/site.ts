export const site = {
  name: "myblog",
  title: "myblog — 개발과 회고 기록",
  description:
    "Next.js와 FastAPI로 만든 개인 블로그. 개발 공부와 프로젝트 회고를 기록합니다.",
  // 배포 후 실제 도메인으로 교체 (Vercel URL 등). env로 덮어쓸 수 있음.
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
};

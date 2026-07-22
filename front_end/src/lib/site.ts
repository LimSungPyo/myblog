export const site = {
  name: "myblog",
  title: "myblog — 개발과 일상 기록",
  description:
    "Next.js와 FastAPI로 만든 개인 블로그. 개발 공부와 일상을 기록합니다.",
  // 배포 후 실제 도메인으로 교체 (Vercel URL 등). env로 덮어쓸 수 있음.
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
};

/** 상단 주 내비게이션 (소개=페이지, 개발/일상=카테고리, 방명록=페이지) */
export const nav = [
  { href: "/about", label: "소개" },
  { href: "/categories/dev", label: "개발" },
  { href: "/categories/life", label: "일상" },
  { href: "/guestbook", label: "방명록" },
];

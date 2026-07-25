export const site = {
  name: "SlowNSteady",
  title: "SlowNSteady — 개발과 일상 기록",
  description:
    "Next.js와 FastAPI로 만든 개인 블로그. 개발 공부와 일상을 기록합니다.",
  tagline: "Building things, one step at a time.",
  // 배포 후 실제 도메인으로 교체 (Vercel URL 등). env로 덮어쓸 수 있음.
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
};

/** 히어로(홈 상단) 문구 */
export const hero = {
  title: "SlowNSteady",
  headline: ["천천히,", "하지만 꾸준히."],
  subline: ["기록하고, 배우고,", "만들어 갑니다."],
};

/**
 * 상단 주 내비게이션.
 * 소개=페이지, 개발/일상=카테고리, 공부 기록/미니게임=준비 중 페이지, 방명록=페이지
 */
export const nav = [
  { href: "/about", label: "소개" },
  { href: "/categories/dev", label: "개발" },
  { href: "/categories/study", label: "공부 기록" },
  { href: "/categories/life", label: "일상" },
  { href: "/minigame", label: "미니게임" },
  { href: "/guestbook", label: "방명록" },
];

/** 푸터 소셜 링크 — 실제 주소로 교체하세요. (# 은 아직 미설정) */
export const social = {
  github: "#",
  notion: "#",
  email: "#",
};

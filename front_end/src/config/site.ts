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
  // 헤더에 이미 사이트 이름이 있어서, 첫 화면 맨 위에는 이름 대신 무엇을 적는 곳인지 적는다
  eyebrow: "개발과 일상 기록",
  headline: ["천천히,", "하지만 꾸준히."],
  subline: ["기록하고, 배우고,", "만들어 갑니다."],
};

/**
 * 상단 주 내비게이션.
 * 소개=페이지, 개발/일상=카테고리, 공부 기록/미니게임=준비 중 페이지, 방명록=페이지
 * desc는 홈의 "어디로 갈까요?" 다이얼에서 보여주는 한 줄 설명(소개 페이지의 목록과 같은 말)이다.
 */
export const nav = [
  { href: "/about", label: "소개", desc: "블로그와 저를 소개합니다." },
  {
    href: "/categories/dev",
    label: "개발",
    desc: "공부한 것, 만든 것, 그리고 삽질한 것.",
  },
  {
    href: "/categories/study",
    label: "공부 기록",
    desc: "배우면서 정리한 노트와 회고.",
  },
  {
    href: "/categories/life",
    label: "일상",
    desc: "개발 말고 그냥 사는 이야기.",
  },
  {
    href: "/minigame",
    label: "미니게임",
    desc: "심심할 때 잠깐 하고 가는 곳.",
  },
  {
    href: "/guestbook",
    label: "방명록",
    desc: "놀러 오셨다면 한마디 남겨주세요.",
  },
];

/** 푸터 소셜 링크 — 실제 주소로 교체하세요. (# 은 아직 미설정) */
export const social = {
  github: "#",
  notion: "#",
  email: "#",
};

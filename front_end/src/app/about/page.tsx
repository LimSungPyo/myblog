import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "소개",
  description: "블로그와 저를 소개합니다.",
};

export default function AboutPage() {
  return (
    <article className="prose-blog mx-auto w-full max-w-3xl">
      <h1 className="text-3xl font-bold tracking-tight">소개</h1>
      <p>
        안녕하세요 반갑습니다! 이름 그대로 천천히, 그래도 꾸준히 가보자는
        마음으로 만든 블로그입니다. 개발하면서 배운 것들과 사는 이야기를 부담
        없이 적어두는 공간입니다.
      </p>
      <p>
        사실 이 블로그 자체가 제 프로젝트이기도 합니다. 화면 하나, API 하나 직접
        붙여가며 배운 것을 여기에 그대로 쌓고 있습니다. 그래서 완성했다기보다는
        계속 고쳐나가는 중이라고 보는 편이 맞습니다.
      </p>

      <h2>여기서 볼 수 있는 것들</h2>
      <ul>
        <li>개발 — 공부한 것, 만든 것, 그리고 삽질한 것</li>
        <li>공부 기록 — 배우면서 정리한 노트와 회고</li>
        <li>일상 — 개발 말고 그냥 사는 이야기</li>
        <li>방명록 — 놀러 오셨다면 한마디 남겨주세요</li>
        <li>미니게임 — 심심할 때 잠깐 하고 가는 곳</li>
      </ul>

      <h2>기술 스택</h2>
      <p>대단한 건 아니고, 하나씩 직접 붙여보며 배우는 중입니다.</p>
      <ul>
        <li>프론트엔드 — Next.js, TypeScript, Tailwind CSS (Vercel 배포)</li>
        <li>백엔드 — FastAPI, SQLAlchemy, Alembic (Render 배포)</li>
        <li>데이터베이스 — PostgreSQL (로컬 Docker, 운영 Supabase)</li>
      </ul>
    </article>
  );
}

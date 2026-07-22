import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "소개",
  description: "블로그와 저를 소개합니다.",
};

export default function AboutPage() {
  return (
    <article className="prose-blog">
      <h1 className="text-3xl font-bold tracking-tight">소개</h1>
      <p>
        안녕하세요! 개발 공부와 일상을 기록하는 개인 블로그입니다. 이 페이지는
        나중에 자유롭게 채워 넣으세요.
      </p>

      <h2>이 블로그는</h2>
      <ul>
        <li>
          <strong>개발</strong> — 공부한 것, 만든 것, 삽질 기록
        </li>
        <li>
          <strong>일상</strong> — 소소한 이야기
        </li>
        <li>
          <strong>방명록</strong> — 방문자들이 가볍게 남기는 인스턴트 글 (준비
          중)
        </li>
      </ul>

      <h2>기술 스택</h2>
      <p>Next.js · FastAPI · PostgreSQL(Supabase) 로 직접 만들었습니다.</p>
    </article>
  );
}

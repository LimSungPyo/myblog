import type { Category, Comment, Post, Tag } from "./types";

export const categories: Category[] = [
  { id: 1, name: "개발", slug: "dev" },
  { id: 2, name: "회고", slug: "retro" },
  { id: 3, name: "일상", slug: "life" },
];

export const tags: Tag[] = [
  { id: 1, name: "Next.js", slug: "nextjs" },
  { id: 2, name: "FastAPI", slug: "fastapi" },
  { id: 3, name: "TypeScript", slug: "typescript" },
  { id: 4, name: "PostgreSQL", slug: "postgresql" },
  { id: 5, name: "SEO", slug: "seo" },
];

const body1 = `## 왜 Next.js인가

React만으로도 SPA를 만들 수 있지만, 블로그처럼 **검색 노출(SEO)** 이 중요한 서비스에서는
서버 사이드 렌더링(SSR)이 큰 무기가 됩니다.

- **CSR**: 브라우저가 JS를 받아 화면을 그림 → 초기 HTML이 비어 있어 크롤러에 불리
- **SSR**: 서버가 완성된 HTML을 내려줌 → 크롤러가 본문을 바로 읽음

\`\`\`ts
export default async function Page() {
  const posts = await getPosts(); // 서버에서 미리 조회
  return <PostList posts={posts} />;
}
\`\`\`

> 이 블로그도 상세 페이지를 서버 컴포넌트에서 렌더링합니다.
`;

const body2 = `## FastAPI로 API 서버 붙이기

프론트는 Vercel, 백엔드는 Render에 올리고 그 사이를 REST로 연결했습니다.

1. \`GET /posts\` — 목록 + 페이지네이션
2. \`GET /posts/{slug}\` — 상세
3. \`POST /auth/login\` — 관리자 JWT 발급

Pydantic으로 응답 스키마를 camelCase로 맞추면 프론트에서 그대로 쓰기 편합니다.
`;

const body3 = `## 첫 배포 회고

GitHub에 push 한 번으로 Vercel이 알아서 빌드/배포해주는 경험은 꽤 강력했습니다.
CI/CD가 뭔지 몸으로 이해하게 된 하루.
`;

export const posts: Post[] = [
  {
    id: 1,
    slug: "why-nextjs-for-blog",
    title: "블로그에 Next.js를 쓰는 이유",
    excerpt: "SPA/CSR/SSR 차이를 정리하고, 왜 블로그에는 SSR이 유리한지 살펴봅니다.",
    content: body1,
    coverImage: null,
    category: categories[0],
    tags: [tags[0], tags[2], tags[4]],
    status: "published",
    viewCount: 128,
    createdAt: "2026-07-10T09:00:00Z",
    updatedAt: "2026-07-10T09:00:00Z",
    publishedAt: "2026-07-10T09:00:00Z",
  },
  {
    id: 2,
    slug: "attach-fastapi-backend",
    title: "FastAPI로 백엔드 붙이기",
    excerpt: "Next.js 프론트에 FastAPI + PostgreSQL 백엔드를 연결한 과정.",
    content: body2,
    coverImage: null,
    category: categories[0],
    tags: [tags[1], tags[3]],
    status: "published",
    viewCount: 74,
    createdAt: "2026-07-13T09:00:00Z",
    updatedAt: "2026-07-13T09:00:00Z",
    publishedAt: "2026-07-13T09:00:00Z",
  },
  {
    id: 3,
    slug: "first-deploy-retro",
    title: "첫 배포 회고",
    excerpt: "Vercel GitHub 연동으로 CI/CD를 처음 경험한 이야기.",
    content: body3,
    coverImage: null,
    category: categories[1],
    tags: [tags[0], tags[4]],
    status: "published",
    viewCount: 41,
    createdAt: "2026-07-15T09:00:00Z",
    updatedAt: "2026-07-15T09:00:00Z",
    publishedAt: "2026-07-15T09:00:00Z",
  },
];

export const comments: Comment[] = [
  {
    id: 1,
    postId: 1,
    authorName: "방문자",
    content: "SSR 설명이 깔끔하네요!",
    createdAt: "2026-07-11T02:00:00Z",
  },
];

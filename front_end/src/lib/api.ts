import type {
  Category,
  Comment,
  Paginated,
  Post,
  PostQuery,
  Tag,
} from "./types";
import {
  categories as mockCategories,
  comments as mockComments,
  posts as mockPosts,
  tags as mockTags,
} from "./mock";

/**
 * API 레이어.
 * - API_BASE_URL 환경변수가 있으면 실제 FastAPI 백엔드를 호출한다.
 * - 없으면 목(mock) 데이터로 동작한다. (백엔드 없이 프론트만 개발/배포 가능)
 */
const BASE = process.env.API_BASE_URL?.replace(/\/$/, "");
const useMock = !BASE;

const DEFAULT_PAGE_SIZE = 6;

/**
 * 캐시 정책 (correctness by default):
 * - 기본은 "no-store"(매 요청마다 최신) → 변경이 즉시 반영, stale 버그 예방
 * - 캐시는 "자주 안 바뀌고 잠깐 stale해도 되는" 데이터에만 revalidate 초를 명시적으로 지정
 *   (예: 목록 60, 분류/슬러그 300)
 */
async function apiGet<T>(
  path: string,
  revalidate: number | "no-store" = "no-store",
): Promise<T> {
  const cacheInit: RequestInit =
    revalidate === "no-store"
      ? { cache: "no-store" }
      : { next: { revalidate } };
  const res = await fetch(`${BASE}${path}`, {
    ...cacheInit,
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

/* ---------------- Posts ---------------- */

export async function getPosts(
  query: PostQuery = {},
): Promise<Paginated<Post>> {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;

  if (!useMock) {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    if (query.category) params.set("category", query.category);
    if (query.tag) params.set("tag", query.tag);
    if (query.q) params.set("q", query.q);
    // 목록은 캐시 OK (자주 안 바뀌고 잠깐 stale 허용)
    return apiGet<Paginated<Post>>(`/posts?${params.toString()}`, 60);
  }

  // ---- mock ----
  let items = mockPosts.filter((p) => p.status === "published");
  if (query.category)
    items = items.filter((p) => p.category?.slug === query.category);
  if (query.tag)
    items = items.filter((p) => p.tags.some((t) => t.slug === query.tag));
  if (query.q) {
    const q = query.q.toLowerCase();
    items = items.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q),
    );
  }
  items = [...items].sort(
    (a, b) =>
      new Date(b.publishedAt ?? b.createdAt).getTime() -
      new Date(a.publishedAt ?? a.createdAt).getTime(),
  );
  const total = items.length;
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getPost(slug: string): Promise<Post | null> {
  if (!useMock) {
    try {
      // 기본(no-store) → 상세 페이지 진입 시 매번 최신 DB 값(조회수 등)
      return await apiGet<Post>(`/posts/${slug}`);
    } catch {
      return null;
    }
  }
  return mockPosts.find((p) => p.slug === slug) ?? null;
}

export async function getAllPublishedSlugs(): Promise<string[]> {
  if (!useMock) return apiGet<string[]>("/posts/slugs", 300);
  return mockPosts.filter((p) => p.status === "published").map((p) => p.slug);
}

/* ---------------- Taxonomy ---------------- */

export async function getCategories(): Promise<Category[]> {
  if (!useMock) return apiGet<Category[]>("/categories", 300);
  return mockCategories;
}

export async function getTags(): Promise<Tag[]> {
  if (!useMock) return apiGet<Tag[]>("/tags", 300);
  return mockTags;
}

/* ---------------- Comments ---------------- */

export async function getComments(slug: string): Promise<Comment[]> {
  // 기본(no-store) → 관리자의 숨김/삭제가 즉시 반영
  if (!useMock) return apiGet<Comment[]>(`/posts/${slug}/comments`);
  const post = mockPosts.find((p) => p.slug === slug);
  if (!post) return [];
  return mockComments.filter((c) => c.postId === post.id);
}

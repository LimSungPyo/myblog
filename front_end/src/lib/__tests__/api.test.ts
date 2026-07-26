import { describe, it, expect } from "vitest";
import {
  getPosts,
  getPost,
  getAllPublishedSlugs,
  getGuestbook,
} from "@/lib/api";

// API_BASE_URL 미설정 → lib/api.ts는 mock 데이터로 동작

describe("getPosts (mock 모드)", () => {
  it("published 글만 반환", async () => {
    const { items, total } = await getPosts();
    expect(items.every((p) => p.status === "published")).toBe(true);
    expect(total).toBeGreaterThan(0);
  });

  it("검색어로 필터", async () => {
    const { items } = await getPosts({ q: "FastAPI" });
    expect(items.length).toBeGreaterThan(0);
    expect(items.some((p) => p.title.includes("FastAPI"))).toBe(true);
  });

  it("pageSize 만큼만 반환", async () => {
    const { items, pageSize } = await getPosts({ pageSize: 1 });
    expect(items.length).toBe(1);
    expect(pageSize).toBe(1);
  });

  it("카테고리 필터", async () => {
    const { items } = await getPosts({ category: "dev" });
    expect(items.every((p) => p.category?.slug === "dev")).toBe(true);
  });

  it("#슬러그 로 태그 검색", async () => {
    const { items } = await getPosts({ q: "#nextjs" });
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((p) => p.tags.some((t) => t.slug === "nextjs"))).toBe(
      true,
    );
  });

  it("#이름 은 대소문자·점 무시하고 태그 검색", async () => {
    const { items } = await getPosts({ q: "#Next.js" });
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((p) => p.tags.some((t) => t.name === "Next.js"))).toBe(
      true,
    );
  });

  it("#검색은 제목/본문이 아닌 태그만 매칭", async () => {
    // 존재하지 않는 태그 → 제목/본문에 같은 단어가 있어도 0건
    const { items } = await getPosts({ q: "#블로그" });
    expect(items).toHaveLength(0);
  });
});

describe("getPost (mock 모드)", () => {
  it("slug로 조회", async () => {
    const post = await getPost("why-nextjs-for-blog");
    expect(post?.slug).toBe("why-nextjs-for-blog");
  });
  it("없는 slug면 null", async () => {
    expect(await getPost("does-not-exist")).toBeNull();
  });
});

describe("getAllPublishedSlugs (mock 모드)", () => {
  it("발행글 slug 목록 반환", async () => {
    const slugs = await getAllPublishedSlugs();
    expect(slugs).toContain("why-nextjs-for-blog");
  });
});

describe("getGuestbook (mock 모드)", () => {
  it("페이지네이션된 방명록 반환", async () => {
    const { items, total, pageSize, totalPages } = await getGuestbook(1);
    expect(total).toBeGreaterThan(0);
    expect(items.length).toBeLessThanOrEqual(pageSize);
    expect(totalPages).toBeGreaterThanOrEqual(1);
    expect(items[0]).toHaveProperty("authorName");
  });
});

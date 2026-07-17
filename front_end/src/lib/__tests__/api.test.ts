import { describe, it, expect } from "vitest";
import { getPosts, getPost, getAllPublishedSlugs } from "@/lib/api";

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

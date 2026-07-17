import { describe, it, expect } from "vitest";
import { slugify } from "@/lib/slug";

describe("slugify", () => {
  it("영문을 소문자화하고 공백을 하이픈으로", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });
  it("한글은 유지", () => {
    expect(slugify("나의 블로그")).toBe("나의-블로그");
  });
  it("특수문자 제거", () => {
    expect(slugify("Hello, World!")).toBe("hello-world");
  });
  it("연속 공백·하이픈 정리", () => {
    expect(slugify("a   b--c")).toBe("a-b-c");
  });
});

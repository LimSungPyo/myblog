import { describe, it, expect } from "vitest";
import {
  imageMarkdown,
  insertAt,
  replacePlaceholder,
  uploadingPlaceholder,
} from "@/lib/markdownImage";

describe("insertAt", () => {
  it("줄 중간이면 앞뒤로 줄바꿈을 끼워 이미지가 한 줄을 차지하게 한다", () => {
    expect(insertAt("앞글뒷글", 2, "IMG")).toBe("앞글\nIMG\n뒷글");
  });

  it("이미 줄 경계면 줄바꿈을 더하지 않는다", () => {
    expect(insertAt("첫줄\n둘째줄", 3, "IMG")).toBe("첫줄\nIMG\n둘째줄");
    expect(insertAt("", 0, "IMG")).toBe("IMG");
  });

  it("범위를 벗어난 위치는 끝이나 처음으로 붙인다", () => {
    expect(insertAt("본문", 99, "IMG")).toBe("본문\nIMG");
    expect(insertAt("본문", -5, "IMG")).toBe("IMG\n본문");
  });
});

describe("replacePlaceholder", () => {
  it("업로드가 끝나면 자리표시를 실제 이미지로 바꾼다", () => {
    const text = `앞\n${uploadingPlaceholder("a")}\n뒤`;
    expect(
      replacePlaceholder(text, "a", imageMarkdown("https://x/1.webp")),
    ).toBe("앞\n![이미지](https://x/1.webp)\n뒤");
  });

  it("여러 장이 동시에 올라가도 각자 자기 자리를 찾는다", () => {
    let text = [uploadingPlaceholder("a"), uploadingPlaceholder("b")].join(
      "\n",
    );
    text = replacePlaceholder(text, "b", "B");
    text = replacePlaceholder(text, "a", "A");
    expect(text).toBe("A\nB");
  });

  it("실패하면 자리표시를 줄째로 지운다", () => {
    const text = `앞\n${uploadingPlaceholder("a")}\n뒤`;
    expect(replacePlaceholder(text, "a", "")).toBe("앞\n뒤");
  });

  it("주소에 $가 섞여도 글자 그대로 들어간다", () => {
    // String.replace는 두 번째 인자의 $&를 "찾은 문자열"로 바꿔버린다
    const url = "https://x/a$&b.webp";
    expect(replacePlaceholder(uploadingPlaceholder("a"), "a", url)).toBe(url);
  });
});

describe("imageMarkdown", () => {
  it("대체 텍스트에 파일 이름을 쓰지 않는다", () => {
    expect(imageMarkdown("https://x/1.webp")).toBe(
      "![이미지](https://x/1.webp)",
    );
  });
});

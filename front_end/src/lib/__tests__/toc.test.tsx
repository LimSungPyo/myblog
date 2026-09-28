import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import MarkdownRenderer from "@/components/ui/MarkdownRenderer";
import { extractToc } from "@/lib/toc";

const POST = [
  "# 제목은 목차에 안 들어간다",
  "## 설치 방법",
  "본문",
  "### Node.js `22` 설치",
  "#### 너무 잘은 제목",
  "## 설치 방법",
  "```md",
  "## 코드 속 제목은 제목이 아니다",
  "```",
  "## **굵은** 제목과 [링크](https://example.com)",
  "## Q&A: 왜 FastAPI?",
].join("\n\n");

describe("글 목차", () => {
  it("##·### 제목만 순서대로 뽑고, 코드 속 #은 무시한다", () => {
    expect(extractToc(POST)).toEqual([
      { id: "설치-방법", text: "설치 방법", depth: 2 },
      { id: "nodejs-22-설치", text: "Node.js 22 설치", depth: 3 },
      { id: "설치-방법-1", text: "설치 방법", depth: 2 },
      {
        id: "굵은-제목과-링크",
        text: "굵은 제목과 링크",
        depth: 2,
      },
      { id: "qa-왜-fastapi", text: "Q&A: 왜 FastAPI?", depth: 2 },
    ]);
  });

  // 목차를 누르면 #id로 이동한다. 본문 제목의 id와 하나라도 어긋나면 그 링크는 아무 데도 안 간다.
  function expectEveryTocLinkLands(markdown: string) {
    const { container, unmount } = render(
      <MarkdownRenderer content={markdown} />,
    );
    for (const item of extractToc(markdown)) {
      const heading = container.querySelector(`[id="${item.id}"]`);
      expect(heading, item.id).not.toBeNull();
      expect(heading?.tagName).toBe(`H${item.depth}`);
      expect(heading?.textContent).toBe(item.text);
    }
    unmount();
  }

  it("목차의 id마다 본문에 도착할 제목이 있다", () => {
    expectEveryTocLinkLands(POST);
  });

  it("목차에 안 넣는 깊이에 같은 이름 제목이 끼어 있어도 번호가 맞는다", () => {
    const markdown = "## 준비\n\n#### 준비\n\n## 준비";
    expect(extractToc(markdown).map((i) => i.id)).toEqual(["준비", "준비-2"]);
    expectEveryTocLinkLands(markdown);
  });

  it("목차에 안 넣는 제목도 id는 달려서 같은 이름 번호가 밀리지 않는다", () => {
    const { container } = render(<MarkdownRenderer content={POST} />);
    expect(container.querySelector("h1")?.id).toBe("제목은-목차에-안-들어간다");
    expect(container.querySelector("h4")?.id).toBe("너무-잘은-제목");
  });

  it("제목이 없는 글은 빈 목차", () => {
    expect(extractToc("그냥 문단만 있는 글")).toEqual([]);
  });
});

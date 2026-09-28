import GithubSlugger from "github-slugger";
import type { Heading, Root } from "mdast";
import { toString } from "mdast-util-to-string";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";

/**
 * 글 목차. 본문 제목에 붙는 id와 목차 링크가 반드시 같아야 한다.
 *
 * 그래서 id를 만드는 규칙을 한 곳(`walkHeadings`)에만 둔다. 본문을 그릴 때는
 * react-markdown 안에서 이 규칙으로 제목에 id를 달고(`remarkHeadingIds`), 목차는
 * 서버에서 같은 마크다운을 같은 규칙으로 한 번 더 읽어 만든다(`extractToc`).
 * 둘 다 같은 파서(remark + GFM)가 만든 같은 트리를 같은 순서로 도니 결과가 같다.
 *
 * 흔히 쓰는 rehype-slug는 HTML로 바꾼 뒤의 글자로 id를 만들어서, 마크다운에서 뽑은
 * 목차와 드물게 어긋날 수 있다(예: 제목 속 이미지). 한 트리에서 둘 다 만들면 그럴 일이 없다.
 */

export interface TocItem {
  id: string;
  text: string;
  depth: 2 | 3;
}

/** 목차에 넣는 제목 깊이. 글 제목이 h1이라 본문은 ##부터 쓴다. ####부터는 너무 잘다. */
const TOC_DEPTHS = new Set([2, 3]);

function walkHeadings(
  tree: Root,
  onHeading: (node: Heading, id: string, text: string) => void,
) {
  // 같은 제목이 두 번 나오면 두 번째는 "-1"이 붙는다(GitHub과 같은 규칙).
  // 그래서 목차에 안 넣는 깊이의 제목도 빠짐없이 같은 순서로 세야 한다.
  const slugger = new GithubSlugger();
  visit(tree, "heading", (node) => {
    const text = toString(node).trim();
    const id = slugger.slug(text);
    onHeading(node, id, text);
  });
}

/** react-markdown에 끼우는 플러그인. 제목마다 id를 달아 목차 링크(#id)가 도착할 곳을 만든다. */
export function remarkHeadingIds() {
  return (tree: Root) => {
    walkHeadings(tree, (node, id) => {
      // 글자가 없는 제목은 id도 비어서 달지 않는다
      if (!id) return;
      node.data = {
        ...node.data,
        hProperties: { ...node.data?.hProperties, id },
      };
    });
  };
}

/** 본문 마크다운에서 목차를 뽑는다. 서버에서 불러 목차를 첫 화면부터 그린다. */
export function extractToc(markdown: string): TocItem[] {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(markdown);
  const items: TocItem[] = [];
  walkHeadings(tree, (node, id, text) => {
    if (!id || !TOC_DEPTHS.has(node.depth)) return;
    items.push({ id, text, depth: node.depth as 2 | 3 });
  });
  return items;
}

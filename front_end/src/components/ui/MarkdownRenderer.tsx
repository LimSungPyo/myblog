"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import { remarkHeadingIds } from "@/lib/toc";
import CodeBlock from "./CodeBlock";

const components: Components = {
  // 화면에 가까워질 때 불러온다. 글을 끝까지 안 읽고 나가는 방문자 몫의 이미지는 아예
  // 전송되지 않아서, 이미지 저장소(Supabase 무료 월 5GB) 전송량 한도가 그만큼 오래 간다.
  // node는 react-markdown이 넘기는 내부 값이라 DOM 속성으로 흘러가지 않게 빼낸다.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- 버리려고 꺼내는 값
  img: ({ node, alt, ...props }) => (
    // eslint-disable-next-line @next/next/no-img-element -- 글쓴이가 넣은 임의 주소라 next/image 도메인 설정을 쓸 수 없다
    <img {...props} alt={alt ?? ""} loading="lazy" decoding="async" />
  ),
  // 코드 블록에 복사 버튼을 붙인다. 문장 속 `인라인 코드`는 <pre>가 아니라 해당 없다.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- 버리려고 꺼내는 값
  pre: ({ node, ...props }) => <CodeBlock {...props} />,
};

export default function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="prose-blog">
      <ReactMarkdown
        // 제목 id는 목차(extractToc)와 같은 규칙으로 단다. 순서도 같아야 해서 GFM 다음에 둔다.
        remarkPlugins={[remarkGfm, remarkHeadingIds]}
        rehypePlugins={[rehypeHighlight]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

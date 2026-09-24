"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";

const components: Components = {
  // 화면에 가까워질 때 불러온다. 글을 끝까지 안 읽고 나가는 방문자 몫의 이미지는 아예
  // 전송되지 않아서, 이미지 저장소(Supabase 무료 월 5GB) 전송량 한도가 그만큼 오래 간다.
  // node는 react-markdown이 넘기는 내부 값이라 DOM 속성으로 흘러가지 않게 빼낸다.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- 버리려고 꺼내는 값
  img: ({ node, alt, ...props }) => (
    // eslint-disable-next-line @next/next/no-img-element -- 글쓴이가 넣은 임의 주소라 next/image 도메인 설정을 쓸 수 없다
    <img {...props} alt={alt ?? ""} loading="lazy" decoding="async" />
  ),
};

export default function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="prose-blog">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

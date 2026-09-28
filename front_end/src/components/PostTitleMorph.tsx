/// <reference types="react/canary" />
import * as React from "react";

/** 같은 글의 제목이 목록과 상세에서 같은 이름을 갖게 한다. 페이지 이동 때 브라우저가 이 이름으로 짝을 찾는다 */
export function postTitleTransitionName(postId: number) {
  return `post-title-${postId}`;
}

/**
 * 글 카드 제목 ↔ 글 상세 제목을 페이지 이동 사이에 이어 준다.
 *
 * 양쪽 페이지에 같은 이름이 있을 때만 움직인다(share). 한쪽에만 나타나거나 사라질 때는
 * 움직이지 않게 default="none"을 둔다. 모양은 globals.css의 .post-title 규칙이 정한다.
 * 감싸는 자식은 블록 요소 하나여야 한다(여러 줄로 쪼개지는 인라인 요소는 브라우저가 잡지 못한다).
 */
export default function PostTitleMorph({
  postId,
  children,
}: {
  postId: number;
  children: React.ReactNode;
}) {
  // Next가 쓰는 canary React에만 있다. 테스트(jsdom)의 안정판 React에서는 그냥 자식만 그린다
  const ViewTransition = React.ViewTransition;
  if (!ViewTransition) return children;
  return (
    <ViewTransition
      name={postTitleTransitionName(postId)}
      share="post-title"
      default="none"
    >
      {children}
    </ViewTransition>
  );
}

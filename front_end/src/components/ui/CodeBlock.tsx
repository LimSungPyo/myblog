"use client";

import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { CheckIcon, CopyIcon } from "@/components/ui/icons";

type CopyState = "idle" | "copied" | "failed";

const LABELS: Record<CopyState, string> = {
  idle: "복사",
  copied: "복사됨",
  failed: "복사 실패",
};

const ICONS: Record<CopyState, ReactNode> = {
  idle: <CopyIcon className="h-[13px] w-[13px]" />,
  copied: <CheckIcon className="h-[13px] w-[13px]" />,
  failed: null,
};

// "복사됨" 표시를 얼마나 보여줄지
const RESET_MS = 2000;

/**
 * 본문의 코드 블록. 오른쪽 위에 복사 버튼을 붙인다.
 *
 * 복사할 글자는 누르는 순간 화면에 그려진 코드에서 읽는다. 코드 색칠(하이라이트)이
 * 글자를 여러 조각으로 나눠 감싸 두지만, textContent는 조각을 이어 붙인 원래 코드다.
 * 버튼은 <pre> 바깥에 둬서 "복사" 글자가 복사 내용에 섞이지 않게 한다.
 */
export default function CodeBlock({
  children,
  ...props
}: ComponentProps<"pre">) {
  const preRef = useRef<HTMLPreElement>(null);
  const [state, setState] = useState<CopyState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  async function copy() {
    const pre = preRef.current;
    const code = pre?.querySelector("code") ?? pre;
    // 마크다운 코드 블록은 끝에 줄바꿈이 하나 붙어 있다. 붙여넣었을 때 빈 줄이 생기지 않게 뗀다.
    const text = (code?.textContent ?? "").replace(/\n$/, "");
    let next: CopyState = "copied";
    try {
      // 클립보드는 https(또는 localhost)에서만 열려 있다. 막혀 있으면 실패로 알린다.
      await navigator.clipboard.writeText(text);
    } catch {
      next = "failed";
    }
    setState(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), RESET_MS);
  }

  return (
    <div className="code-block">
      <pre ref={preRef} {...props}>
        {children}
      </pre>
      {/* 세 상태의 글자를 한자리에 겹쳐 두고 지금 것만 보이게 한다. 바뀔 때 살짝 흐려지며
          서로 스며들어서, 두 글자가 겹쳐 보이는 순간이 덜 거슬린다. 버튼 이름은 aria-label이 맡는다 */}
      <button
        type="button"
        onClick={copy}
        title="코드 복사"
        aria-label={LABELS[state]}
        data-state={state}
        className="code-copy"
      >
        {(Object.keys(LABELS) as CopyState[]).map((key) => (
          <span
            key={key}
            aria-hidden
            data-shown={key === state}
            className="code-copy-label"
          >
            {ICONS[key]}
            {LABELS[key]}
          </span>
        ))}
      </button>
      {/* 버튼 글자가 바뀐 것을 화면 낭독기에도 알린다 */}
      <span className="sr-only" aria-live="polite">
        {state === "idle" ? "" : LABELS[state]}
      </span>
    </div>
  );
}

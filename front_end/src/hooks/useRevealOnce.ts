import { useEffect, useRef, useState, type RefObject } from "react";

/** 구역의 위쪽이 화면 아래에서 이만큼(15%) 올라왔을 때 "보였다"고 본다. 끝에 걸치자마자 시작하면 움직임을 못 보고 지나친다 */
const ROOT_MARGIN = "0px 0px -15% 0px";

/**
 * 요소가 처음 화면에 들어왔는지. 한 번 true가 되면 다시 false로 돌아가지 않는다
 * (스크롤할 때마다 다시 숨었다 나타나면 읽는 사람과 싸우는 화면이 된다).
 * 이미 쓰고 있는 ref가 있으면 넘겨서 같이 쓴다.
 * IntersectionObserver가 없는 브라우저에서는 바로 보인 것으로 친다.
 */
export function useRevealOnce<T extends Element>(
  existing?: RefObject<T | null>,
) {
  const own = useRef<T>(null);
  const ref = existing ?? own;
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      const frame = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(frame);
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: ROOT_MARGIN },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);

  return [ref, shown] as const;
}

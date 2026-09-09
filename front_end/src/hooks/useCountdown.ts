"use client";

import { useEffect, useState } from "react";

/** 주어진 시각까지 남은 초. 지났거나 null이면 0. */
function remainingUntil(deadline: number | null): number {
  if (deadline === null) return 0;
  return Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
}

/**
 * `deadline`(epoch ms)까지 남은 초를 1초마다 갱신해 돌려준다.
 *
 * 429를 받았을 때 "37초 후에 다시 시도해주세요"를 고정 문구로 띄우면, 사용자가
 * 30초를 기다린 뒤에도 화면은 여전히 37초라고 말한다. 남은 시간이 줄어드는 걸
 * 보여줘야 기다릴지 판단할 수 있고, 0이 되는 순간 버튼을 다시 열어줄 수 있다.
 *
 * 남은 초가 아니라 만료 시각을 받는 이유는 두 가지다. 같은 대기 시간(예: 60초)으로
 * 두 번 거절당해도 값이 달라져 카운트다운이 다시 시작되고, 브라우저가 비활성 탭의
 * 타이머를 늦춰도 화면에 실제 남은 시간이 나온다.
 */
export function useCountdown(deadline: number | null): number {
  // 남은 초를 state에 담지 않고 렌더할 때마다 계산한다. state로 들고 있으면 effect
  // 안에서 setState를 부르게 되고(만료 시각이 바뀔 때 초기화해야 하므로) 렌더가
  // 한 번 더 도는 데다, 값이 시계와 어긋날 여지도 생긴다. 여기서 타이머가 하는 일은
  // "값을 갱신하는 것"이 아니라 "1초마다 다시 그리라고 알리는 것"뿐이다.
  const [, tick] = useState(0);

  useEffect(() => {
    if (deadline === null) return;
    const timer = setInterval(() => {
      tick((t) => t + 1);
      if (remainingUntil(deadline) <= 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [deadline]);

  return remainingUntil(deadline);
}

/** 429 응답의 대기 초를 만료 시각으로 바꾼다. 값이 없으면 null. */
export function deadlineFrom(retryAfter: number | undefined): number | null {
  return retryAfter === undefined ? null : Date.now() + retryAfter * 1000;
}

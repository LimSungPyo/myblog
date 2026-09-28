/** 휴대폰 상태 표시줄·주소창 색. globals.css의 --background와 같은 값이어야 한다 */
export const THEME_COLOR = { light: "#fdfdfc", dark: "#0d0d0e" } as const;

/**
 * 사용자가 고른 테마에 맞춰 theme-color 메타 태그를 모두 같은 색으로 바꾼다.
 * 메타 태그에는 기기 설정 기준 media가 붙어 있어서, 그대로 두면 기기는 다크인데
 * 사이트는 라이트로 골랐을 때 표시줄만 검게 남는다.
 */
export function applyThemeColor(isDark: boolean) {
  const color = isDark ? THEME_COLOR.dark : THEME_COLOR.light;
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((meta) => meta.setAttribute("content", color));
}

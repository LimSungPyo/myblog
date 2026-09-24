/**
 * 마크다운 본문에 이미지를 끼워 넣는 순수 함수들.
 *
 * 업로드는 몇 초 걸리고, 그동안 글쓴이는 계속 타이핑한다. 업로드가 끝난 시점의 커서
 * 위치에 넣으면 엉뚱한 곳에 들어가므로, 올리기 시작한 순간 그 자리에 자리표시를 먼저
 * 꽂아두고 끝나면 그걸 실제 이미지로 바꾼다. 여러 장을 동시에 올려도 각자 자기 자리를 찾는다.
 */

/** 업로드가 끝나기 전에 본문에 먼저 꽂아두는 자리표시. id로 각 업로드를 구분한다. */
export function uploadingPlaceholder(id: string): string {
  return `![업로드 중…](#uploading-${id})`;
}

/**
 * 대체 텍스트는 일부러 파일 이름을 쓰지 않는다. "주민등록증 스캔.jpg"처럼 이름 자체가
 * 정보를 흘릴 수 있고, 대체 텍스트는 HTML에 그대로 공개된다. 글쓴이가 직접 고치면 된다.
 */
export function imageMarkdown(url: string, alt = "이미지"): string {
  return `![${alt}](${url})`;
}

/** 이미지는 한 줄을 따로 차지하는 게 자연스러워서, 줄 중간이면 앞뒤로 줄바꿈을 끼운다. */
export function insertAt(
  text: string,
  position: number,
  snippet: string,
): string {
  const pos = Math.max(0, Math.min(position, text.length));
  const before = text.slice(0, pos);
  const after = text.slice(pos);
  const lead = before === "" || before.endsWith("\n") ? "" : "\n";
  const trail = after === "" || after.startsWith("\n") ? "" : "\n";
  return before + lead + snippet + trail + after;
}

/**
 * 자리표시를 실제 내용으로 바꾼다. 빈 문자열이면(업로드 실패) 자리표시와 그 뒤 줄바꿈을 지운다.
 *
 * `text.replace(문자열, 문자열)`을 쓰지 않는 이유: 두 번째 인자 안의 `$&`, `$1` 같은 패턴을
 * 자바스크립트가 특수 문법으로 해석한다. 이미지 주소에 `$`가 섞이면 결과가 깨진다.
 * 함수로 넘기면 반환값이 글자 그대로 들어간다.
 */
export function replacePlaceholder(
  text: string,
  id: string,
  replacement: string,
): string {
  const placeholder = uploadingPlaceholder(id);
  const target =
    replacement === "" && text.includes(`${placeholder}\n`)
      ? `${placeholder}\n`
      : placeholder;
  return text.replace(target, () => replacement);
}

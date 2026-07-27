/**
 * 2048 순수 게임 로직 (렌더/랜덤과 분리 → 단위 테스트 용이).
 * 보드는 4×4 숫자 격자. 0은 빈 칸을 의미한다.
 */

export const SIZE = 4;
export type Board = number[][];
export type Direction = "up" | "down" | "left" | "right";

/** 모두 빈 칸인 새 보드 */
export function emptyBoard(): Board {
  return Array.from({ length: SIZE }, () => Array<number>(SIZE).fill(0));
}

/** 빈 칸(행,열) 좌표 목록 */
export function emptyCells(board: Board): [number, number][] {
  const cells: [number, number][] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === 0) cells.push([r, c]);
    }
  }
  return cells;
}

/**
 * 한 줄을 왼쪽으로 밀어 붙이고 인접한 같은 값을 1회 병합.
 * 반환: 결과 줄(길이 SIZE) + 이번에 병합으로 얻은 점수 합.
 */
export function slideRowLeft(row: number[]): { row: number[]; gained: number } {
  const nums = row.filter((n) => n !== 0);
  const out: number[] = [];
  let gained = 0;
  for (let i = 0; i < nums.length; i++) {
    if (i + 1 < nums.length && nums[i] === nums[i + 1]) {
      const merged = nums[i] * 2;
      out.push(merged);
      gained += merged;
      i++; // 병합에 사용된 다음 칸은 건너뜀 (한 번만 병합)
    } else {
      out.push(nums[i]);
    }
  }
  while (out.length < SIZE) out.push(0);
  return { row: out, gained };
}

function transpose(board: Board): Board {
  return board[0].map((_, c) => board.map((row) => row[c]));
}

function reverseRows(board: Board): Board {
  return board.map((row) => [...row].reverse());
}

export function boardsEqual(a: Board, b: Board): boolean {
  return a.every((row, r) => row.every((v, c) => v === b[r][c]));
}

/**
 * 방향키 입력 처리. 어떤 방향이든 "왼쪽 밀기"로 정규화해 계산 후 되돌린다.
 * 반환: 이동 후 보드 + 획득 점수 + 실제로 배치가 바뀌었는지(moved).
 * moved가 false면 새 타일을 스폰하지 않는다(2048 규칙).
 */
export function move(
  board: Board,
  dir: Direction,
): { board: Board; gained: number; moved: boolean } {
  let work: Board;
  if (dir === "left") work = board.map((r) => [...r]);
  else if (dir === "right") work = reverseRows(board);
  else if (dir === "up") work = transpose(board);
  else work = reverseRows(transpose(board)); // down

  let gained = 0;
  const slid = work.map((r) => {
    const s = slideRowLeft(r);
    gained += s.gained;
    return s.row;
  });

  let result: Board;
  if (dir === "left") result = slid;
  else if (dir === "right") result = reverseRows(slid);
  else if (dir === "up") result = transpose(slid);
  else result = transpose(reverseRows(slid)); // down

  return { board: result, gained, moved: !boardsEqual(board, result) };
}

/** 더 이상 이동할 수 없으면 true (빈 칸 없고 인접 병합도 불가) */
export function isGameOver(board: Board): boolean {
  if (emptyCells(board).length > 0) return false;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const v = board[r][c];
      if (c + 1 < SIZE && board[r][c + 1] === v) return false;
      if (r + 1 < SIZE && board[r + 1][c] === v) return false;
    }
  }
  return true;
}

/** 2048 타일 달성 여부 */
export function hasWon(board: Board): boolean {
  return board.some((row) => row.some((v) => v >= 2048));
}

/**
 * 빈 칸 하나에 새 타일(2: 90%, 4: 10%)을 놓은 새 보드를 반환.
 * randomFn은 [0,1) 난수(테스트에서 주입 가능). 빈 칸이 없으면 원본 반환.
 */
export function spawnTile(
  board: Board,
  randomFn: () => number = Math.random,
): Board {
  const cells = emptyCells(board);
  if (cells.length === 0) return board;
  const [r, c] = cells[Math.floor(randomFn() * cells.length)];
  const value = randomFn() < 0.9 ? 2 : 4;
  const next = board.map((row) => [...row]);
  next[r][c] = value;
  return next;
}

/** 타일 2개가 놓인 시작 보드 */
export function initBoard(randomFn: () => number = Math.random): Board {
  return spawnTile(spawnTile(emptyBoard(), randomFn), randomFn);
}

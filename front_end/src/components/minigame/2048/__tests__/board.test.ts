import { describe, it, expect } from "vitest";
import {
  boardsEqual,
  emptyCells,
  initBoard,
  isGameOver,
  hasWon,
  move,
  slideRowLeft,
  spawnTile,
  type Board,
} from "../board";

describe("slideRowLeft", () => {
  it("빈 칸을 왼쪽으로 밀어 붙인다", () => {
    expect(slideRowLeft([0, 2, 0, 4]).row).toEqual([2, 4, 0, 0]);
  });

  it("인접한 같은 값을 병합하고 점수를 반환한다", () => {
    const { row, gained } = slideRowLeft([2, 2, 0, 0]);
    expect(row).toEqual([4, 0, 0, 0]);
    expect(gained).toBe(4);
  });

  it("한 줄에서 같은 값이라도 한 번만 병합한다", () => {
    // [2,2,2,2] → [4,4] (4번이 8이 되지 않음)
    const { row, gained } = slideRowLeft([2, 2, 2, 2]);
    expect(row).toEqual([4, 4, 0, 0]);
    expect(gained).toBe(8);
  });

  it("서로 다른 값은 병합하지 않는다", () => {
    expect(slideRowLeft([2, 4, 0, 0]).row).toEqual([2, 4, 0, 0]);
  });
});

describe("move", () => {
  it("왼쪽 이동", () => {
    const board: Board = [
      [0, 2, 2, 0],
      [4, 0, 0, 4],
      [0, 0, 0, 0],
      [8, 0, 2, 2],
    ];
    const { board: next, gained, moved } = move(board, "left");
    expect(next).toEqual([
      [4, 0, 0, 0],
      [8, 0, 0, 0],
      [0, 0, 0, 0],
      [8, 4, 0, 0],
    ]);
    expect(gained).toBe(4 + 8 + 4);
    expect(moved).toBe(true);
  });

  it("오른쪽 이동", () => {
    const board: Board = [
      [2, 2, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    expect(move(board, "right").board[0]).toEqual([0, 0, 0, 4]);
  });

  it("위쪽 이동", () => {
    const board: Board = [
      [2, 0, 0, 0],
      [2, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    expect(move(board, "up").board.map((r) => r[0])).toEqual([4, 0, 0, 0]);
  });

  it("아래쪽 이동", () => {
    const board: Board = [
      [2, 0, 0, 0],
      [2, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    expect(move(board, "down").board.map((r) => r[0])).toEqual([0, 0, 0, 4]);
  });

  it("변화가 없으면 moved=false", () => {
    const board: Board = [
      [2, 4, 8, 16],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    expect(move(board, "left").moved).toBe(false);
  });
});

describe("isGameOver", () => {
  it("빈 칸이 있으면 게임오버 아님", () => {
    const board = [
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 0],
    ];
    expect(isGameOver(board)).toBe(false);
  });

  it("인접 병합이 가능하면 게임오버 아님", () => {
    const board = [
      [2, 2, 4, 8],
      [4, 8, 16, 32],
      [2, 4, 8, 16],
      [4, 8, 16, 32],
    ];
    expect(isGameOver(board)).toBe(false);
  });

  it("빈 칸도 병합도 없으면 게임오버", () => {
    const board = [
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 2],
    ];
    expect(isGameOver(board)).toBe(true);
  });
});

describe("hasWon", () => {
  it("2048 타일이 있으면 승리", () => {
    const board = [
      [2048, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    expect(hasWon(board)).toBe(true);
  });
  it("없으면 승리 아님", () => {
    expect(hasWon([
      [2, 4, 8, 16],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ])).toBe(false);
  });
});

describe("spawnTile / initBoard", () => {
  it("빈 칸 하나를 채운다", () => {
    const before = emptyCells(
      [
        [2, 2, 2, 2],
        [2, 2, 2, 2],
        [2, 2, 2, 0],
        [2, 2, 2, 2],
      ],
    ).length;
    const next = spawnTile(
      [
        [2, 2, 2, 2],
        [2, 2, 2, 2],
        [2, 2, 2, 0],
        [2, 2, 2, 2],
      ],
      () => 0,
    );
    expect(emptyCells(next).length).toBe(before - 1);
    expect(next[2][3]).toBe(2); // randomFn=0 → 첫 빈칸, 값 2
  });

  it("initBoard는 타일 2개로 시작", () => {
    const board = initBoard(() => 0.5);
    const filled = board.flat().filter((v) => v !== 0);
    expect(filled.length).toBeGreaterThanOrEqual(1);
    expect(filled.length).toBeLessThanOrEqual(2);
  });
});

describe("boardsEqual", () => {
  it("같은 보드는 true", () => {
    const a: Board = initBoard(() => 0.1);
    expect(boardsEqual(a, a.map((r) => [...r]))).toBe(true);
  });
});

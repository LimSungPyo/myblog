import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import MarkdownRenderer from "@/components/ui/MarkdownRenderer";

// userEvent는 자체 가짜 클립보드를 끼워 넣어서, 여기서는 fireEvent로 누른다
function stubClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: vi.fn(writeText) },
  });
  return navigator.clipboard.writeText as ReturnType<typeof vi.fn>;
}

const CODE = "```python\ndef hello():\n    print('안녕')\n```";

describe("코드 복사 버튼", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("코드 블록마다 복사 버튼이 붙고, 문장 속 인라인 코드에는 없다", () => {
    render(
      <MarkdownRenderer content={`본문의 \`x\` 코드\n\n${CODE}\n\n${CODE}`} />,
    );
    expect(screen.getAllByRole("button", { name: "복사" })).toHaveLength(2);
  });

  it("누르면 코드 원문을 복사하고 잠깐 '복사됨'으로 바뀐다", async () => {
    const writeText = stubClipboard(async () => {});
    render(<MarkdownRenderer content={CODE} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "복사" }));
    });

    // 색칠용 조각으로 나뉘어 있어도 원래 코드 그대로, 끝의 줄바꿈과 버튼 글자는 빠진다
    expect(writeText).toHaveBeenCalledWith("def hello():\n    print('안녕')");
    expect(screen.getByRole("button", { name: "복사됨" })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByRole("button", { name: "복사" })).toBeInTheDocument();
  });

  it("클립보드가 막혀 있으면 실패했다고 알린다", async () => {
    stubClipboard(async () => {
      throw new Error("denied");
    });
    render(<MarkdownRenderer content={CODE} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "복사" }));
    });
    expect(
      screen.getByRole("button", { name: "복사 실패" }),
    ).toBeInTheDocument();
  });

  it("언어를 적지 않은 코드도 복사된다", async () => {
    const writeText = stubClipboard(async () => {});
    render(<MarkdownRenderer content={"```\nnpm run dev\n```"} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "복사" }));
    });
    expect(writeText).toHaveBeenCalledWith("npm run dev");
  });
});

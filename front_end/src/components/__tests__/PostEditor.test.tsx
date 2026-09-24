import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";

// 실제 마크다운 에디터는 무겁고 브라우저 API에 많이 기대서, 같은 역할(값·onChange·
// textarea 속성 전달)만 하는 입력칸으로 바꿔 끼운다. 붙여넣기·커서 처리는 그대로 탄다.
vi.mock("next/dynamic", () => ({
  default: () =>
    function MockMDEditor({
      value,
      onChange,
      textareaProps,
    }: {
      value: string;
      onChange: (v?: string) => void;
      textareaProps?: ComponentProps<"textarea">;
    }) {
      return (
        <textarea
          aria-label="본문"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          {...textareaProps}
        />
      );
    },
}));
vi.mock("@uiw/react-md-editor/markdown-editor.css", () => ({}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const uploadImage = vi.fn();
vi.mock("@/lib/adminApi", () => ({
  adminApi: {
    uploadImage: (f: File) => uploadImage(f),
    createPost: vi.fn(),
    updatePost: vi.fn(),
  },
}));

import PostEditor from "@/components/PostEditor";

function png(name = "a.png") {
  return new File(["x"], name, { type: "image/png" });
}

function body() {
  return screen.getByLabelText("본문") as HTMLTextAreaElement;
}

describe("PostEditor 이미지 넣기", () => {
  beforeEach(() => {
    uploadImage.mockReset();
    // 카테고리·태그 목록 요청
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("[]")),
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("이미지를 붙여넣으면 올려서 본문에 넣는다", async () => {
    uploadImage.mockResolvedValue({
      url: "https://cdn/1.webp",
      width: 1,
      height: 1,
    });
    render(<PostEditor />);
    const file = png();

    fireEvent.paste(body(), { clipboardData: { files: [file] } });

    await waitFor(() =>
      expect(body().value).toContain("![이미지](https://cdn/1.webp)"),
    );
    expect(uploadImage).toHaveBeenCalledWith(file);
  });

  it("글자 붙여넣기는 가로채지 않는다", () => {
    render(<PostEditor />);
    fireEvent.paste(body(), { clipboardData: { files: [] } });
    expect(uploadImage).not.toHaveBeenCalled();
  });

  it("끌어다 놓아도 올라간다", async () => {
    uploadImage.mockResolvedValue({
      url: "https://cdn/2.webp",
      width: 1,
      height: 1,
    });
    render(<PostEditor />);

    fireEvent.drop(body(), {
      dataTransfer: { files: [png()], types: ["Files"] },
    });

    await waitFor(() => expect(body().value).toContain("https://cdn/2.webp"));
  });

  it("올리는 동안에는 저장 버튼을 잠근다", async () => {
    // 끝나기 전에 저장하면 '업로드 중…' 자리표시가 글에 그대로 박힌다
    let finish!: (v: unknown) => void;
    uploadImage.mockReturnValue(new Promise((r) => (finish = r)));
    render(<PostEditor />);

    fireEvent.paste(body(), { clipboardData: { files: [png()] } });

    expect(
      await screen.findByText("이미지를 올리는 중이에요…"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /임시저장/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /발행/ })).toBeDisabled();

    await act(async () =>
      finish({ url: "https://cdn/3.webp", width: 1, height: 1 }),
    );
    expect(screen.getByRole("button", { name: /임시저장/ })).toBeEnabled();
  });

  it("실패하면 이유를 보여주고 본문에 자리표시를 남기지 않는다", async () => {
    uploadImage.mockRejectedValue(
      new Error("이미지는 10MB 이하만 올릴 수 있어요."),
    );
    render(<PostEditor />);

    fireEvent.paste(body(), { clipboardData: { files: [png()] } });

    expect(
      await screen.findByText("이미지는 10MB 이하만 올릴 수 있어요."),
    ).toBeInTheDocument();
    expect(body().value).not.toContain("업로드 중");
  });

  it("커버 이미지를 업로드하면 주소가 채워지고 미리보기가 뜬다", async () => {
    uploadImage.mockResolvedValue({
      url: "https://cdn/cover.webp",
      width: 1,
      height: 1,
    });
    render(<PostEditor />);

    await userEvent.upload(
      screen.getByLabelText("커버 이미지 파일"),
      png("cover.png"),
    );

    await waitFor(() =>
      expect(screen.getByLabelText("커버 이미지(선택)")).toHaveValue(
        "https://cdn/cover.webp",
      ),
    );
    expect(screen.getByAltText("커버 이미지 미리보기")).toHaveAttribute(
      "src",
      "https://cdn/cover.webp",
    );
  });
});

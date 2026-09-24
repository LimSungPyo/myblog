import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useState } from "react";

const uploadImage = vi.fn();
vi.mock("@/lib/adminApi", () => ({
  adminApi: { uploadImage: (f: File) => uploadImage(f) },
}));

import {
  imageFilesOf,
  useMarkdownImageUpload,
} from "@/hooks/useMarkdownImageUpload";

function png(name = "a.png") {
  return new File(["x"], name, { type: "image/png" });
}

/** 업로드 응답을 테스트가 원하는 순간에 돌려주기 위한 약속(Promise) 손잡이 */
function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function setup(initial: string) {
  return renderHook(() => {
    const [content, setContent] = useState(initial);
    return { content, setContent, ...useMarkdownImageUpload(setContent) };
  });
}

describe("useMarkdownImageUpload", () => {
  beforeEach(() => {
    // 중괄호 없는 화살표면 mock(함수)이 반환돼 vitest가 teardown으로 호출해버린다.
    // 그러면 mockRejectedValue로 설정한 거부 Promise가 테스트 끝에 튀어나와 실패로 잡힌다.
    // (TroubleShoot 005에서 이미 한 번 겪은 문제)
    uploadImage.mockReset();
  });

  it("올리는 동안 자리표시를 보여주고, 끝나면 이미지로 바꾼다", async () => {
    const d = deferred<{ url: string }>();
    uploadImage.mockReturnValue(d.promise);
    const { result } = setup("앞글");

    let done!: Promise<void>;
    act(() => {
      done = result.current.uploadInto([png()], 2);
    });
    expect(result.current.content).toContain("업로드 중");
    expect(result.current.uploading).toBe(true);

    await act(async () => {
      d.resolve({ url: "https://cdn/1.webp" });
      await done;
    });
    expect(result.current.content).toBe("앞글\n![이미지](https://cdn/1.webp)");
    expect(result.current.uploading).toBe(false);
  });

  it("업로드 중에 계속 쓴 글이 날아가지 않는다", async () => {
    const d = deferred<{ url: string }>();
    uploadImage.mockReturnValue(d.promise);
    const { result } = setup("첫 문단");

    let done!: Promise<void>;
    act(() => {
      done = result.current.uploadInto([png()], 4);
    });
    // 업로드가 끝나기 전에 글쓴이가 뒤에 더 적는다
    act(() => result.current.setContent((prev) => `${prev}\n두 번째 문단`));

    await act(async () => {
      d.resolve({ url: "https://cdn/1.webp" });
      await done;
    });
    expect(result.current.content).toBe(
      "첫 문단\n![이미지](https://cdn/1.webp)\n두 번째 문단",
    );
  });

  it("여러 장은 고른 순서대로 들어간다 (늦게 끝난 게 앞이어도)", async () => {
    const first = deferred<{ url: string }>();
    const second = deferred<{ url: string }>();
    uploadImage
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const { result } = setup("");

    let done!: Promise<void>;
    act(() => {
      done = result.current.uploadInto([png("1.png"), png("2.png")], 0);
    });
    await act(async () => {
      second.resolve({ url: "https://cdn/2.webp" });
      first.resolve({ url: "https://cdn/1.webp" });
      await done;
    });
    expect(result.current.content).toBe(
      "![이미지](https://cdn/1.webp)\n![이미지](https://cdn/2.webp)",
    );
  });

  it("실패하면 자리표시를 지우고 서버가 준 이유를 보여준다", async () => {
    uploadImage.mockRejectedValue(
      new Error("이미지는 10MB 이하만 올릴 수 있어요."),
    );
    const { result } = setup("본문");

    await act(async () => {
      await result.current.uploadInto([png()], 2);
    });
    expect(result.current.content).toBe("본문\n");
    expect(result.current.error).toBe("이미지는 10MB 이하만 올릴 수 있어요.");
  });
});

describe("imageFilesOf", () => {
  it("이미지가 아닌 파일은 거른다", () => {
    const pdf = new File(["x"], "a.pdf", { type: "application/pdf" });
    expect(imageFilesOf([png(), pdf])).toHaveLength(1);
    expect(imageFilesOf(null)).toEqual([]);
  });
});

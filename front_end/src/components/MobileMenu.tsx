"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import SearchBar from "@/components/SearchBar";
import SiteNav from "@/components/SiteNav";
import { CloseIcon, MenuIcon } from "@/components/ui/icons";

/**
 * 좁은 화면(lg 미만)의 ☰ 펼침 메뉴. 헤더 바로 아래로 검색창과 주 메뉴가 펼쳐진다.
 *
 * 닫혀 있을 때도 화면에 둔 채 CSS로 숨긴다(.mobile-menu). 그래야 닫힐 때도 움직임이 보이고,
 * 열리는 도중에 다시 눌러도 그 자리에서 되돌아간다. 닫힌 동안은 inert라 탭 이동·화면 낭독기에서 빠진다.
 */
export default function MobileMenu() {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  // 다른 페이지로 옮겨 가면 닫는다. effect에서 상태를 바꾸면 한 번 더 그리게 되므로 그리는 중에 맞춘다
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    // Esc로 닫고, 손이 가 있던 ☰ 버튼으로 초점을 돌려준다
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    // 열려 있는 동안 뒤 페이지가 스크롤되지 않게 한다
    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      root.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className="lg:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen((v) => !v)}
        className="press grid h-11 w-11 place-items-center rounded-xl text-foreground"
      >
        {open ? (
          <CloseIcon className="h-[22px] w-[22px]" />
        ) : (
          <MenuIcon className="h-[22px] w-[22px]" />
        )}
      </button>

      {/* 막과 메뉴는 헤더(relative) 기준으로 헤더 바로 아래에 붙는다. 헤더 줄은 덮지 않아서
          ☰(닫기) 버튼을 계속 누를 수 있다. 뒤 화면을 어둡게 덮는 막은 누르면 닫힌다 */}
      <div
        aria-hidden
        data-open={open}
        onClick={close}
        className="mobile-menu-scrim absolute inset-x-0 top-full h-dvh bg-scrim"
      />

      <div
        id="mobile-menu"
        data-open={open}
        inert={!open}
        className="mobile-menu absolute inset-x-0 top-full flex flex-col gap-3 rounded-b-2xl border-b border-line bg-background px-4 pt-2 pb-5"
      >
        <Suspense fallback={null}>
          <SearchBar className="w-full" />
        </Suspense>
        <SiteNav variant="menu" onNavigate={close} />
      </div>
    </div>
  );
}

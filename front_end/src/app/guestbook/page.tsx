import type { Metadata } from "next";
import GuestbookForm from "@/components/guestbook/GuestbookForm";
import GuestbookPagination from "@/components/guestbook/GuestbookPagination";
import { UserIcon } from "@/components/ui/icons";
import { getGuestbook } from "@/lib/api";
import { formatRelativeTime } from "@/lib/format";

export const metadata: Metadata = {
  title: "방명록",
  description: "가볍게 인사를 남겨주세요.",
};

// 카드 공통: 흰 카드 + 부드러운 그림자 (연회색 배경 위에서 뜨도록)
const cardClass =
  "rounded-2xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_16px_rgba(0,0,0,0.05)] dark:bg-neutral-900 dark:shadow-none dark:ring-1 dark:ring-white/10";

export default async function GuestbookPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Number(pageParam) || 1;
  const { items, totalPages } = await getGuestbook(page);

  return (
    // 헤더 아래 전체 폭 연회색 배경 (full-bleed).
    // main을 세로 flex로 만들고 grow로 남은 높이를 채움 → 콘텐츠가 짧아도 푸터까지 회색.
    // -my-8은 main의 py-8을 상쇄해 헤더/푸터 경계까지 닿게 함.
    <div className="relative left-1/2 -my-8 w-screen grow -translate-x-1/2 bg-[#f7f7f9] dark:bg-neutral-950">
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="grid gap-8 md:grid-cols-[minmax(0,220px)_1fr]">
          <aside className="md:pt-1">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              방명록
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-neutral-500">
              방문해 주셔서 감사합니다.
              <br />
              따뜻한 한마디 남겨주세요 :)
            </p>
          </aside>

          <div>
            <GuestbookForm cardClass={cardClass} />

            <ul className="mt-4 space-y-4">
              {items.length === 0 ? (
                <li className="rounded-2xl border border-dashed border-black/15 p-10 text-center text-sm text-neutral-500 dark:border-white/20">
                  아직 방명록이 없어요. 첫 인사를 남겨보세요!
                </li>
              ) : (
                items.map((e) => (
                  <li key={e.id} className={`${cardClass} p-5`}>
                    <div className="flex items-start gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-neutral-200 text-neutral-400 dark:bg-neutral-700 dark:text-neutral-500">
                        <UserIcon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                            {e.authorName}
                          </span>
                          <time
                            className="text-neutral-400"
                            dateTime={e.createdAt}
                            suppressHydrationWarning
                          >
                            · {formatRelativeTime(e.createdAt)}
                          </time>
                        </div>
                        <p className="mt-1.5 whitespace-pre-wrap text-sm text-neutral-700 dark:text-neutral-300">
                          {e.content}
                        </p>
                      </div>
                    </div>
                  </li>
                ))
              )}
            </ul>

            <GuestbookPagination page={page} totalPages={totalPages} />
          </div>
        </div>
      </div>
    </div>
  );
}

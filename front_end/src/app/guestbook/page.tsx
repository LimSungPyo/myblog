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

// 카드 공통: 글 카드와 같은 반투명 그림자 테두리
const cardClass = "rounded-[4px] bg-surface shadow-card";

export default async function GuestbookPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Number(pageParam) || 1;
  const { items, totalPages } = await getGuestbook(page);

  return (
    // 예전엔 방명록만 전체 폭 회색 바탕이라 다른 사이트처럼 보였다. 다른 화면과 같은 바탕에 같은 카드를 쓴다
    <div className="pt-2 lg:pt-6">
      <div>
        <div className="grid gap-6 md:grid-cols-[minmax(0,220px)_1fr] md:gap-12">
          <aside className="flex flex-col gap-3 md:gap-3.5">
            <h1 className="text-4xl font-extrabold tracking-[-0.03em] lg:text-[46px] lg:leading-[1.15]">
              방명록
            </h1>
            <p className="text-sm leading-relaxed text-muted">
              방문해 주셔서 감사합니다.
              <br />
              따뜻한 한마디 남겨주세요 :)
            </p>
          </aside>

          <div className="flex flex-col gap-3">
            <GuestbookForm cardClass={cardClass} />

            <ul className="flex flex-col gap-3">
              {items.length === 0 ? (
                <li className="rounded-[4px] border border-dashed border-line p-10 text-center text-sm text-muted">
                  아직 방명록이 없어요. 첫 인사를 남겨보세요!
                </li>
              ) : (
                items.map((e) => (
                  <li
                    key={e.id}
                    className={`${cardClass} p-4 lg:px-5 lg:py-[18px]`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full bg-chip text-muted">
                        <UserIcon className="h-[18px] w-[18px]" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-semibold">{e.authorName}</span>
                          <time
                            className="text-muted"
                            dateTime={e.createdAt}
                            suppressHydrationWarning
                          >
                            {formatRelativeTime(e.createdAt)}
                          </time>
                        </div>
                        {e.content && (
                          <p className="mt-1 text-[15px] leading-relaxed whitespace-pre-wrap">
                            {e.content}
                          </p>
                        )}
                        {e.imageUrl && (
                          // eslint-disable-next-line @next/next/no-img-element -- 저장소 주소를 그대로 쓴다. next/image는 이미지를 Vercel을 거쳐 다시 내보내서 그쪽 한도까지 쓰게 된다
                          <img
                            src={e.imageUrl}
                            alt={`${e.authorName}님이 남긴 사진`}
                            loading="lazy"
                            decoding="async"
                            className="mt-3 max-h-80 w-auto max-w-full rounded-xl shadow-card"
                          />
                        )}
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

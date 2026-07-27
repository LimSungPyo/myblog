import Image from "next/image";
import { hero } from "@/config/site";

export default function Hero() {
  return (
    // pb-20: 예전 '최신 글 보기' 버튼이 차지하던 높이만큼 보정 →
    // 고정 크기 컴퍼스(h-480)의 아랫부분이 최근 글 구분선에서 자연스럽게 잘림
    <section className="relative overflow-hidden pb-20">
      <Image
        src="/images/logo-hero.png"
        alt=""
        width={945}
        height={1097}
        priority
        aria-hidden
        className="pointer-events-none absolute right-12 top-[48px] hidden h-[480px] w-auto lg:block"
      />

      <div className="relative max-w-xl py-14 sm:py-20">
        <p className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          {hero.title}
        </p>

        <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-slate-800 dark:text-white sm:text-5xl">
          {hero.headline.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </h1>

        <p className="mt-5 text-lg leading-relaxed text-neutral-500">
          {hero.subline.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}

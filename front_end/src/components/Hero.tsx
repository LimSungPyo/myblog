import Image from "next/image";
import Link from "next/link";
import { hero } from "@/config/site";
import { ArrowDownIcon } from "@/components/ui/icons";

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <Image
        src="/images/logo-hero.png"
        alt=""
        width={945}
        height={1097}
        priority
        aria-hidden
        className="pointer-events-none absolute right-4 top-[48px] hidden h-[480px] w-auto lg:block"
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

        <Link
          href="#recent"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-neutral-200"
        >
          최신 글 보기
          <ArrowDownIcon className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

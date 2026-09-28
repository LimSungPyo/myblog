import { hero } from "@/config/site";

export default function Hero() {
  return (
    <section className="flex items-center justify-between pt-8 pb-10 lg:pt-16 lg:pb-[72px]">
      <div className="flex max-w-xl flex-col gap-3.5 lg:gap-5">
        <p className="font-mono text-xs tracking-[0.04em] text-muted lg:text-[13px]">
          {hero.eyebrow}
        </p>

        <h1 className="font-serif text-[44px] leading-[1.15] font-bold tracking-[-0.03em] lg:text-[72px] lg:leading-[1.12]">
          {hero.headline.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </h1>

        <p className="text-base leading-relaxed text-muted lg:text-lg">
          {hero.subline.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </p>
      </div>

      {/* 컴퍼스 그림을 모양 틀로 쓰고 옅은 색(--compass)으로 칠한다. 라이트·다크 모두 배경에 은은하게 깔린다 */}
      <span
        aria-hidden
        className="hero-compass mr-14 hidden h-[348px] w-[300px] shrink-0 bg-compass lg:block"
      />
    </section>
  );
}

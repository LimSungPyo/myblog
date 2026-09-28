import { site, social } from "@/config/site";
import { GithubIcon, NotionIcon, MailIcon } from "@/components/ui/icons";

const links = [
  { key: "github", href: social.github, label: "GitHub", Icon: GithubIcon },
  { key: "notion", href: social.notion, label: "Notion", Icon: NotionIcon },
  { key: "email", href: social.email, label: "Email", Icon: MailIcon },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-2.5 px-4 pt-6 pb-7 text-[13px] text-muted sm:flex-row sm:justify-between sm:gap-4 sm:py-5">
        <div className="flex items-center gap-2 text-foreground">
          <span
            aria-hidden
            className="footer-logo-mark block h-[22px] w-[19px] shrink-0 bg-current"
          />
          <span className="font-semibold">{site.name}</span>
        </div>

        <p>{site.tagline}</p>

        <div className="flex items-center gap-1">
          {links.map(({ key, href, label, Icon }) => (
            <a
              key={key}
              href={href}
              aria-label={label}
              target={href.startsWith("http") ? "_blank" : undefined}
              rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
              className="press grid h-11 w-11 place-items-center rounded-xl hover:bg-hover hover:text-foreground sm:h-9 sm:w-9 sm:rounded-[9px]"
            >
              <Icon className="h-[18px] w-[18px]" />
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}

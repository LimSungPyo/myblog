import { site, social } from "@/config/site";
import { GithubIcon, NotionIcon, MailIcon } from "@/components/ui/icons";

const links = [
  { key: "github", href: social.github, label: "GitHub", Icon: GithubIcon },
  { key: "notion", href: social.notion, label: "Notion", Icon: NotionIcon },
  { key: "email", href: social.email, label: "Email", Icon: MailIcon },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-black/10 dark:border-white/10">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-4 py-6 text-sm text-neutral-500 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="footer-logo-mark block h-6 w-[21px] shrink-0 bg-neutral-700 dark:bg-neutral-300"
          />
          <span className="font-medium text-neutral-700 dark:text-neutral-300">
            {site.name}
          </span>
        </div>

        <p className="text-neutral-400">{site.tagline}</p>

        <div className="flex items-center gap-3">
          {links.map(({ key, href, label, Icon }) => (
            <a
              key={key}
              href={href}
              aria-label={label}
              target={href.startsWith("http") ? "_blank" : undefined}
              rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
              className="rounded-full p-1.5 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <Icon className="h-5 w-5" />
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}

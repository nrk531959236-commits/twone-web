import Link from "next/link";
import { AccessEntryLink } from "@/components/access-entry-link";
import { ThemeToggle } from "@/components/theme-toggle";

type SiteHeaderProps = {
  current?: "home" | "apply" | "assistant" | "courses" | "admin";
};

type NavItem =
  | {
      href: string;
      label: string;
      key: "home" | "apply" | "assistant";
      note?: string;
      disabled?: false;
    }
  | {
      href: string;
      label: string;
      key: "courses";
      note?: string;
      disabled: true;
    };

const navItems: readonly NavItem[] = [
  { href: "/", label: "首页", key: "home" },
  { href: "/apply", label: "会员申请", key: "apply" },
  { href: "/assistant", label: "AI 助手", key: "assistant", note: "开通会员即可使用" },
  { href: "/courses", label: "课程学习（更新中）", key: "courses", note: "已规划，暂未开放", disabled: true },
] as const;

export function SiteHeader({ current }: SiteHeaderProps) {
  return (
    <header className="site-header section">
      <div className="site-header__brand">
        <div className="site-header__logo">T</div>
        <div>
          <p className="site-header__name">Twone 社区</p>
          <span className="site-header__tag">AI 交易助手会员平台</span>
        </div>
      </div>

      <nav className="site-header__nav" aria-label="主导航">
        {navItems.map((item) => {
          const isActive = current === item.key;
          const isAssistant = item.key === "assistant";
          const isDisabled = item.disabled === true;

          return (
            <div
              key={item.href}
              className={`site-header__nav-item ${isAssistant ? "site-header__nav-item--assistant" : ""} ${isDisabled ? "site-header__nav-item--planned" : ""}`}
            >
              {isDisabled ? (
                <span
                  className={`site-header__link site-header__link--planned ${isActive ? "site-header__link--active" : ""}`}
                  aria-disabled="true"
                  title="课程学习功能正在更新中，暂未开放"
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className={`site-header__link ${isActive ? "site-header__link--active" : ""} ${isAssistant ? "site-header__link--assistant" : ""}`}
                >
                  {item.label}
                </Link>
              )}

              {item.note ? (
                <span
                  className={`site-header__assistant-note ${isDisabled ? "site-header__assistant-note--planned" : ""}`}
                >
                  {item.note}
                </span>
              ) : null}
            </div>
          );
        })}
      </nav>

      <div className="site-header__actions">
        <ThemeToggle />
        <AccessEntryLink href="/assistant" mode="login" className="button button--secondary">
          会员登录
        </AccessEntryLink>
        <Link href="/apply" className="button button--primary">
          立即申请
        </Link>
      </div>
    </header>
  );
}

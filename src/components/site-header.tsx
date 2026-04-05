import Link from "next/link";
import { AccessEntryLink } from "@/components/access-entry-link";

type SiteHeaderProps = {
  current?: "home" | "apply" | "assistant" | "admin";
};

const navItems = [
  { href: "/", label: "首页", key: "home" },
  { href: "/apply", label: "会员申请", key: "apply" },
  { href: "/assistant", label: "AI 助手", key: "assistant" },
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

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`site-header__link ${isActive ? "site-header__link--active" : ""}`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="site-header__actions">
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

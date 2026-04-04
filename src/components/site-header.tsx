import Link from "next/link";

type SiteHeaderProps = {
  current?: "home" | "apply" | "assistant";
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
          <p className="site-header__name">Twone</p>
          <span className="site-header__tag">Private Members Platform</span>
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
        <Link href="/assistant" className="button button--secondary">
          会员登录
        </Link>
        <Link href="/apply" className="button button--primary">
          立即申请
        </Link>
      </div>
    </header>
  );
}

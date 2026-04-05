import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { AdminLoginForm } from "./admin-login-form";

export const metadata: Metadata = {
  title: "管理员登录 | Twone Web3.0 Community",
  description: "Twone 管理员专用登录页：使用 Supabase Auth 邮箱 + 密码登录，登录成功后进入 /admin。",
};

export default function AdminLoginPage() {
  return (
    <main className="page-shell">
      <SiteHeader />

      <section className="section hero page-hero">
        <div className="hero__badge">后台入口 · 内部使用</div>
        <div className="hero__grid admin-login-hero__grid">
          <div className="hero__content">
            <p className="eyebrow">仅供管理员本人使用，不对首页公开暴露</p>
            <h1>管理员后台登录</h1>
            <p className="hero__description">
              这里走的是 <code>Supabase Auth</code> 的邮箱 + 密码登录，不走 magic link。
              登录成功后会直接跳转到 <code>/admin</code>。
              进入后台后，系统仍会继续用 <code>ADMIN_EMAILS</code> 白名单做最终授权；即使账号能登录，只要邮箱不在白名单里，也无法进入后台。
            </p>
          </div>

          <aside className="hero__panel card-glow">
            <div className="panel__topline">
              <span className="status-dot" />
              访问说明
            </div>
            <div className="panel__list">
              <article>
                <span>登录方式</span>
                <strong>Supabase Auth 邮箱 + 密码</strong>
              </article>
              <article>
                <span>跳转目标</span>
                <strong>登录成功后自动进入 /admin</strong>
              </article>
              <article>
                <span>最终权限</span>
                <strong>仍以 ADMIN_EMAILS 白名单为准</strong>
              </article>
            </div>
          </aside>
        </div>
      </section>

      <section className="admin-login-layout">
        <div className="section card-glow admin-login-panel">
          <p className="section__label">Admin Sign In</p>
          <h2>输入管理员邮箱和密码</h2>
          <p className="section__intro admin-login-panel__intro">
            适合管理员自用。若你还没有为该邮箱设置密码，或者只是忘了密码，不用再去 Supabase 后台手工处理，也尽量不再依赖 recovery 邮件回跳；直接在下方填邮箱并站内设置 / 重设密码即可。
          </p>
          <AdminLoginForm />
        </div>

        <aside className="section sidebar-card admin-login-help">
          <p className="section__label">使用提醒</p>
          <h2>后台访问规则</h2>
          <div className="membership-list">
            <div className="membership-list__item">
              <span className="membership-list__icon">✦</span>
              <span>此页面不会在首页和主导航里公开出现，需要手动访问 /admin-login。</span>
            </div>
            <div className="membership-list__item">
              <span className="membership-list__icon">✦</span>
              <span>登录成功 ≠ 一定有后台权限；最终仍会检查 ADMIN_EMAILS。</span>
            </div>
            <div className="membership-list__item">
              <span className="membership-list__icon">✦</span>
              <span>如果管理员邮箱还没有密码，或忘了密码，直接在本页输入邮箱并点击“站内设置 / 重设密码”；只要邮箱在 ADMIN_EMAILS 白名单内，就会直接创建或更新对应的 Supabase Auth 密码。</span>
            </div>
            <div className="membership-list__item">
              <span className="membership-list__icon">✦</span>
              <span>如果跳到 /admin 后看到“当前账号不在后台白名单内”，说明邮箱未加入 ADMIN_EMAILS。</span>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}

import { FirstPasswordForm } from "./first-password-form";

export default async function FirstPasswordPage({
  searchParams,
}: {
  searchParams?: Promise<{ token?: string; email?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const token = params?.token?.trim() ?? "";
  const presetEmail = params?.email?.trim() ?? "";

  return (
    <main className="page-shell">
      <section className="section hero page-hero">
        <div className="hero__badge">First Password Setup · 备用入口</div>
        <div className="section-heading assistant-heading">
          <div>
            <p className="eyebrow">旧版一次性网页内设密入口（备用）</p>
            <h1>首次设置登录密码</h1>
          </div>
          <p className="section__intro">
            这是保留给旧流程的备用入口：仅在你手里已经有管理员生成的一次性链接时才使用。现在主流程已经切到站内自动识别审核结果：已通过但未激活的新老用户，直接去 /assistant 或等待审核页，系统会自动显示首次设置密码表单；设置完成后会立即登录，不再把“管理员生成网页内首次设密链接”作为主路径。
          </p>
        </div>
      </section>

      <FirstPasswordForm token={token} presetEmail={presetEmail} />
    </main>
  );
}

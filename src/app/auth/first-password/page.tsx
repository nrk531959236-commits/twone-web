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
        <div className="hero__badge">First Password Setup</div>
        <div className="section-heading assistant-heading">
          <div>
            <p className="eyebrow">网页内一次性首次设密</p>
            <h1>首次设置登录密码</h1>
          </div>
          <p className="section__intro">
            这是给已审核通过测试用户的网页内设密入口。你需要一条由管理员生成的一次性链接；不是“知道邮箱就能设密码”。链接有效期 24 小时，用过就失效。设置完成后，后续直接用邮箱 + 密码登录即可，不再依赖邮件补密码。
          </p>
        </div>
      </section>

      <FirstPasswordForm token={token} presetEmail={presetEmail} />
    </main>
  );
}

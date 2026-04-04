import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { ApplyForm } from "./apply-form";

export const metadata: Metadata = {
  title: "会员申请 | Twone Web3.0 Community",
  description: "Twone 会员申请页，支持填写基础资料、交易经验、加入原因与 AI 助手使用意向，并提交到 Supabase。",
};

export default function ApplyPage() {
  return (
    <main className="page-shell">
      <SiteHeader current="apply" />

      <section className="section hero page-hero">
        <div className="hero__badge">Membership Application · Supabase Live</div>
        <div className="hero__grid">
          <div className="hero__content">
            <p className="eyebrow">先筛选认知与节奏，再决定是否适合长期同行</p>
            <h1>
              会员申请页，
              <br />
              为真正想做长期积累的人准备。
            </h1>
            <p className="hero__description">
              现在已经接入真实提交链路。你可以在这里补齐成员基础信息、交易背景、加入动机，以及是否希望使用 AI
              助手协同研究，提交后会直接写入申请表。
            </p>
            <div className="hero__stats">
              <div>
                <strong>Step 01</strong>
                <span>填写基础资料</span>
              </div>
              <div>
                <strong>Step 02</strong>
                <span>补充交易经验与方向</span>
              </div>
              <div>
                <strong>Step 03</strong>
                <span>提交申请并等待回访</span>
              </div>
            </div>
          </div>

          <aside className="hero__panel card-glow">
            <div className="panel__topline">
              <span className="status-dot" />
              Review Principles
            </div>
            <div className="panel__title">我们更看重长期主义，而不是短线冲动。</div>
            <div className="panel__list">
              <article>
                <span>Fit</span>
                <strong>是否愿意持续学习、复盘、校正执行。</strong>
              </article>
              <article>
                <span>Signal</span>
                <strong>是否有明确关注方向，而不是纯粹寻求喊单。</strong>
              </article>
              <article>
                <span>Discipline</span>
                <strong>是否具备基本风险意识、仓位纪律和信息判断能力。</strong>
              </article>
            </div>
          </aside>
        </div>
      </section>

      <section className="section form-layout">
        <div className="form-layout__intro">
          <p className="section__label">Application Form</p>
          <h2>填写你的成员画像</h2>
          <p>
            当前页面已连接 Supabase。提交时会把表单内容写入 <code>member_applications</code>
            ，并在前端显示提交中、成功或失败状态。
          </p>
        </div>

        <ApplyForm />
      </section>
    </main>
  );
}

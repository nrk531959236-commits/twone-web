import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { CoursesIcon } from "@/components/section-icons";

export const metadata: Metadata = {
  title: "课程学习 | Twone Web3.0 Community",
  description: "Twone 课程学习页占位入口，当前用于预留未来课程内容、学习路径和更新节奏。",
};

const plannedModules = [
  {
    title: "基础课程框架",
    description: "后续可放市场结构、风险控制、交易执行与复盘方法的入门内容。",
  },
  {
    title: "专题训练单元",
    description: "后续可扩展为 BTC、山寨轮动、仓位管理、事件驱动等专题模块。",
  },
  {
    title: "学习资料与回放",
    description: "当前不接视频、不接上传；这里只先预留未来课程内容容器。",
  },
];

export default function CoursesPage() {
  return (
    <main className="page-shell">
      <SiteHeader current="courses" />

      <section className="section hero page-hero">
        <div className="hero__badge">Courses · Placeholder</div>
        <div className="section-heading">
          <div>
            <p className="eyebrow">课程学习入口已预留，当前先不开放实际内容</p>
            <h1>
              <span className="page-heading-with-icon">
                <CoursesIcon className="page-heading-icon" />
                课程学习（更新中）
              </span>
            </h1>
          </div>
          <p className="section__intro">
            这个页面当前是课程模块的预留位：先把路由、页面结构和说明放好，后续再往里面接课程目录、专题内容、回放或学习任务。现阶段不接视频、不接上传逻辑，只保留清晰的占位说明。
          </p>
        </div>

        <div className="courses-placeholder-grid">
          <article className="courses-placeholder-card card-glow">
            <p className="section__label">Planned Structure</p>
            <h3>
              <span className="section-title-with-icon">
                <CoursesIcon className="section-title-icon" />
                这里会成为后续课程承载页
              </span>
            </h3>
            <p>
              目前先把课程学习的入口和独立路由搭起来，避免后续继续塞回首页或导航临时拼接。等课程内容准备好后，可以直接在这个页面下扩成课程列表、章节页、学习进度或会员专属内容。
            </p>
            <div className="courses-placeholder-status">
              <span className="status-dot" />
              当前状态：已预留路由 / 页面，占位中
            </div>
          </article>

          <aside className="courses-placeholder-card">
            <p className="section__label">Next Modules</p>
            <h3>
              <span className="section-title-with-icon">
                <CoursesIcon className="section-title-icon" />
                后续可直接往这里扩
              </span>
            </h3>
            <ul>
              {plannedModules.map((module) => (
                <li key={module.title}>
                  <strong>{module.title}</strong>
                  <span>{module.description}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </section>
    </main>
  );
}

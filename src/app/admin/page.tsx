import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { getAdminAccess, createSupabaseAdminClient } from "@/lib/admin";
import { approveApplicationAction, rejectApplicationAction, updateMembershipAction } from "./actions";

export const metadata: Metadata = {
  title: "管理后台 | Twone Web3.0 Community",
  description: "Twone 管理后台 V1：基于管理员邮箱白名单，查看申请、查看会员并修改基础 membership 字段。",
};

type ReviewStatus = "pending" | "approved" | "rejected";

type ApplicationRow = {
  id: string;
  created_at: string;
  nickname: string | null;
  contact: string | null;
  region: string | null;
  identity: string | null;
  trading_experience: string | null;
  reason: string | null;
  focus_areas: string[] | string | null;
  wants_ai: boolean | null;
  budget: string | null;
  notes: string | null;
  review_status: ReviewStatus | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
};

function looksLikeEmail(value: string | null) {
  if (!value) {
    return false;
  }

  return value.includes("@");
}

type MembershipRow = {
  user_id: string;
  status: string | null;
  plan: string | null;
  assistant_monthly_quota: number | null;
  started_at: string | null;
  expires_at: string | null;
  updated_at?: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  guest: "访客",
  inactive: "未启用",
  active: "已启用",
  pending: "待审核",
  approved: "已通过",
  rejected: "已拒绝",
};

const PLAN_LABELS: Record<string, string> = {
  free: "免费版",
  pro: "专业版",
  core: "核心版",
  vip: "VIP",
};

function getStatusLabel(status: string | null | undefined) {
  if (!status) {
    return "—";
  }

  return STATUS_LABELS[status.toLowerCase()] ?? status;
}

function getPlanLabel(plan: string | null | undefined) {
  if (!plan) {
    return "—";
  }

  return PLAN_LABELS[plan.toLowerCase()] ?? plan;
}

function formatPlanWithValue(plan: string | null | undefined) {
  if (!plan) {
    return "—";
  }

  const label = getPlanLabel(plan);
  return label === plan ? plan : `${label}（${plan}）`;
}

function formatStatusWithValue(status: string | null | undefined) {
  if (!status) {
    return "—";
  }

  const label = getStatusLabel(status);
  return label === status ? status : `${label}（${status}）`;
}

function ApplicationReviewFooter({ application }: { application: ApplicationRow }) {
  return (
    <footer className="admin-record-card__footer">
      <section className="admin-review-actions" aria-label={`审批区-${application.nickname || application.contact || application.id}`}>
        <div className="admin-review-actions__header">
          <div>
            <span className="section__label">审批操作</span>
            <h4>审批区</h4>
          </div>
          <p>每条申请卡片底部固定显示：通过并开通、拒绝申请、目标用户 ID（Target user_id）、方案、AI 月额度。当前默认按申请登录邮箱直接审批：若该邮箱已登录过，会立即写入 memberships；若还没登录过，会先写入邮箱批准记录，等对方未来首次用该邮箱登录后自动生效。默认发放免费版（free）体验资格与 2 次 AI 对话，仍可在提交前手动调整。</p>
        </div>

        <form action={approveApplicationAction} className="admin-approve-form">
          <input type="hidden" name="applicationId" value={application.id} />
          <input type="hidden" name="applicationContact" value={application.contact ?? ""} />

          <label className="form-field">
            <span>申请登录邮箱</span>
            <input type="text" value={application.contact ?? ""} readOnly />
          </label>

          <label className="form-field">
            <span>目标用户 ID（Target user_id，兜底）</span>
            <input
              name="targetUserId"
              type="text"
              placeholder={looksLikeEmail(application.contact) ? "可留空；如该邮箱已存在会立即开通，否则走邮箱预批准" : "如果申请登录邮箱缺失或异常，这里手填 user_id"}
            />
          </label>

          <label className="form-field">
            <span>方案</span>
            <input name="plan" type="text" defaultValue="free" placeholder="例如：free / pro / core / vip" />
          </label>

          <label className="form-field">
            <span>AI 月额度（assistant_monthly_quota）</span>
            <input name="assistantMonthlyQuota" type="number" min="0" step="1" defaultValue="2" />
          </label>

          <div className="admin-approve-form__hint">
            {looksLikeEmail(application.contact)
              ? "审批通过时会优先按申请里的登录邮箱处理：如果 auth.users 已有该邮箱，会立即开通会员资格；如果还没有，则先记为邮箱已批准，等对方未来第一次用这个邮箱登录 Twone 后自动兑现。当前默认发放免费版（free）体验资格 + 2 次 AI 对话。"
              : "当前申请登录邮箱缺失或格式异常，无法走邮箱审批。建议先让申请人重新提交登录邮箱，或直接在这里手动填目标 user_id。"}
          </div>

          <div className="admin-edit-form__actions">
            <button type="submit" className="button button--primary">
              通过并开通（按邮箱批准 / 立即生效）
            </button>
          </div>
        </form>

        <form action={rejectApplicationAction} className="admin-reject-form">
          <input type="hidden" name="applicationId" value={application.id} />
          <button type="submit" className="button button--ghost button--danger">
            拒绝申请
          </button>
          <p className="admin-reject-form__hint">拒绝申请只会修改审核状态，不会改动 memberships。</p>
        </form>
      </section>
    </footer>
  );
}

function formatTime(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatFocusAreas(value: string[] | string | null) {
  if (Array.isArray(value)) {
    const normalized = value.map((item) => item?.trim()).filter(Boolean);
    return normalized.length ? normalized.join("、") : "—";
  }

  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized ? normalized : "—";
  }

  return "—";
}

function normalizeReviewStatus(status: ReviewStatus | null) {
  return status ?? "pending";
}

function getReviewStatusLabel(status: ReviewStatus | null) {
  switch (normalizeReviewStatus(status)) {
    case "approved":
      return "已通过";
    case "rejected":
      return "已拒绝";
    default:
      return "待处理";
  }
}

function getReviewStatusClassName(status: ReviewStatus | null) {
  switch (normalizeReviewStatus(status)) {
    case "approved":
      return "review-badge review-badge--approved";
    case "rejected":
      return "review-badge review-badge--rejected";
    default:
      return "review-badge review-badge--pending";
  }
}

async function getAdminDashboardData() {
  const supabase = createSupabaseAdminClient();

  const [{ data: applications, error: applicationsError }, { data: memberships, error: membershipsError }] =
    await Promise.all([
      supabase
        .from("member_applications")
        .select(
          "id, created_at, nickname, contact, region, identity, trading_experience, reason, focus_areas, wants_ai, budget, notes, review_status, reviewed_at, reviewed_by",
        )
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("memberships")
        .select("user_id, status, plan, assistant_monthly_quota, started_at, expires_at, updated_at")
        .order("updated_at", { ascending: false, nullsFirst: false })
        .limit(100),
    ]);

  if (applicationsError) {
    throw applicationsError;
  }

  if (membershipsError) {
    throw membershipsError;
  }

  return {
    applications: (applications ?? []) as ApplicationRow[],
    memberships: (memberships ?? []) as MembershipRow[],
  };
}

function AdminDeniedState({ email, allowedEmails }: { email: string | null; allowedEmails: string[] }) {
  return (
    <>
      <section className="section hero page-hero">
        <div className="hero__badge">后台访问 · 受限</div>
        <div className="hero__grid">
          <div className="hero__content">
            <p className="eyebrow">当前账号不在后台白名单内</p>
            <h1>/admin 暂未对该账号开放。</h1>
            <p className="hero__description">
              这是一个最小可用的后台保护方案：先基于登录邮箱 + <code>ADMIN_EMAILS</code> 白名单放行。
              只有登录态邮箱命中白名单，才允许进入后台并执行修改操作。
            </p>
          </div>

          <aside className="hero__panel card-glow">
            <div className="panel__topline">
              <span className="status-dot status-dot--muted" />
              访问检查
            </div>
            <div className="panel__list">
              <article>
                <span>当前邮箱</span>
                <strong>{email ?? "未登录"}</strong>
              </article>
              <article>
                <span>白名单</span>
                <strong>{allowedEmails.length ? allowedEmails.join(" / ") : "未配置 ADMIN_EMAILS"}</strong>
              </article>
              <article>
                <span>下一步</span>
                <strong>补充 ADMIN_EMAILS，并用对应 Supabase 登录邮箱访问 /admin。</strong>
              </article>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}

export default async function AdminPage() {
  const access = await getAdminAccess();

  if (!access.user || !access.isAdmin) {
    return (
      <main className="page-shell">
        <SiteHeader />
        <AdminDeniedState email={access.email} allowedEmails={access.allowedEmails} />
      </main>
    );
  }

  const { applications, memberships } = await getAdminDashboardData();
  const pendingCount = applications.filter((application) => normalizeReviewStatus(application.review_status) === "pending").length;
  const approvedCount = applications.filter((application) => normalizeReviewStatus(application.review_status) === "approved").length;
  const rejectedCount = applications.filter((application) => normalizeReviewStatus(application.review_status) === "rejected").length;

  return (
    <main className="page-shell">
      <SiteHeader />

      <section className="section hero page-hero admin-hero">
        <div className="hero__badge">后台控制台 · V1</div>
        <div className="hero__grid">
          <div className="hero__content">
            <p className="eyebrow">先把手工 SQL 替换成可用后台</p>
            <h1>Twone /admin 管理后台</h1>
            <p className="hero__description">
              当前版本优先追求可用：管理员白名单、申请查看、按邮箱审批、自动兑现会员，以及对 <code>membership status</code>
              、<code>plan</code>、<code>assistant_monthly_quota</code> 的直接修改。为了方便拉人测试，审批默认值已切到 <code>free / 2</code>，但后台仍可按人手动调高或改方案。
            </p>
            <div className="hero__stats">
              <div>
                <strong>{applications.length}</strong>
                <span>最近申请</span>
              </div>
              <div>
                <strong>{pendingCount} / {approvedCount} / {rejectedCount}</strong>
                <span>待处理 / 已通过 / 已拒绝</span>
              </div>
              <div>
                <strong>{access.email}</strong>
                <span>当前管理员</span>
              </div>
            </div>
          </div>

          <aside className="hero__panel card-glow">
            <div className="panel__topline">
              <span className="status-dot" />
              后台范围
            </div>
            <div className="panel__list">
              <article>
                <span>申请管理</span>
                <strong>读取 member_applications，显示待处理 / 已通过 / 已拒绝，并支持按邮箱直接审批默认免费版（free）/ 2 次，或手动改额度。</strong>
              </article>
              <article>
                <span>会员管理</span>
                <strong>读取 memberships，直接修改状态 / 方案 / AI 月额度。</strong>
              </article>
              <article>
                <span>访问保护</span>
                <strong>页面与 Server Action 双重检查管理员邮箱白名单。</strong>
              </article>
            </div>
          </aside>
        </div>
      </section>

      <section className="section admin-tabs-section">
        <div className="section-heading admin-tabs-heading">
          <div>
            <p className="section__label">后台导航</p>
            <h2>后台区块</h2>
          </div>
          <p className="section__intro">先做两个核心块：申请管理 + 会员管理，足够替掉大部分手工查表和更新 SQL。</p>
        </div>

        <div className="admin-tab-links">
          <a href="#applications" className="site-header__link site-header__link--active">
            申请管理
          </a>
          <a href="#memberships" className="site-header__link site-header__link--active">
            会员管理
          </a>
        </div>
      </section>

      <section className="section admin-section" id="applications">
        <div className="section-heading admin-section__heading">
          <div>
            <p className="section__label">申请管理</p>
            <h2>申请管理</h2>
          </div>
          <p className="section__intro">
            直接读取 <code>member_applications</code>，优先看最近提交。现在后台用 <code>review_status</code> 区分
            <code>pending</code> / <code>approved</code> / <code>rejected</code>：待处理、已通过、已拒绝。通过并开通时会优先按申请里的登录邮箱处理：若该邮箱对应用户已存在，则立即写入
            <code>memberships</code>；若该邮箱还没登录过，则先写入邮箱批准记录，等对方未来首次用这个邮箱登录后再自动兑现。当前默认发放 <code>free</code> 免费版与 <code>2</code> 次 AI 对话额度，必要时也可手动填写目标 <code>user_id</code>，或直接改方案与额度。
          </p>
        </div>

        <div className="admin-card-list">
          {applications.length ? (
            applications.map((application) => (
              <article key={application.id} className="admin-record-card">
                <div className="admin-record-card__top">
                  <div>
                    <h3>{application.nickname || "未填写昵称"}</h3>
                    <p>{application.contact || "无登录邮箱"}</p>
                  </div>
                  <div className="admin-record-card__meta">
                    <span className={getReviewStatusClassName(application.review_status)}>
                      {getReviewStatusLabel(application.review_status)}
                    </span>
                    <span>{formatTime(application.created_at)}</span>
                    <span>{application.budget || "未填预算"}</span>
                  </div>
                </div>

                <div className="admin-data-grid">
                  <div>
                    <span>地区</span>
                    <strong>{application.region || "—"}</strong>
                  </div>
                  <div>
                    <span>身份</span>
                    <strong>{application.identity || "—"}</strong>
                  </div>
                  <div>
                    <span>经验</span>
                    <strong>{application.trading_experience || "—"}</strong>
                  </div>
                  <div>
                    <span>AI 意向</span>
                    <strong>
                      {application.wants_ai === null ? "—" : application.wants_ai ? "想使用" : "暂不需要"}
                    </strong>
                  </div>
                  <div>
                    <span>审核时间</span>
                    <strong>{formatTime(application.reviewed_at)}</strong>
                  </div>
                  <div>
                    <span>审核人</span>
                    <strong>{application.reviewed_by || "—"}</strong>
                  </div>
                </div>

                <div className="admin-record-card__body">
                  <div>
                    <span>关注方向</span>
                    <p>{formatFocusAreas(application.focus_areas)}</p>
                  </div>
                  <div>
                    <span>加入原因</span>
                    <p>{application.reason || "—"}</p>
                  </div>
                  <div>
                    <span>补充说明</span>
                    <p>{application.notes || "—"}</p>
                  </div>
                </div>

                <ApplicationReviewFooter application={application} />
              </article>
            ))
          ) : (
            <div className="admin-empty-state">暂无申请数据。</div>
          )}
        </div>
      </section>

      <section className="section admin-section" id="memberships">
        <div className="section-heading admin-section__heading">
          <div>
            <p className="section__label">会员管理</p>
            <h2>会员管理</h2>
          </div>
          <p className="section__intro">
            直接读取 <code>memberships</code>。当前支持修改 <code>status</code>、<code>plan</code>、<code>assistant_monthly_quota</code>，也就是可以随时把免费版次数手动加减，或切换到其他方案。
          </p>
        </div>

        <div className="admin-card-list">
          {memberships.length ? (
            memberships.map((membership) => (
              <article key={membership.user_id} className="admin-record-card admin-record-card--membership">
                <div className="admin-record-card__top">
                  <div>
                    <h3>{membership.user_id}</h3>
                    <p>会员主键：user_id</p>
                  </div>
                  <div className="admin-record-card__meta">
                    <span>开始：{formatTime(membership.started_at)}</span>
                    <span>到期：{formatTime(membership.expires_at)}</span>
                  </div>
                </div>

                <div className="admin-data-grid">
                  <div>
                    <span>当前状态</span>
                    <strong>{formatStatusWithValue(membership.status)}</strong>
                  </div>
                  <div>
                    <span>当前方案</span>
                    <strong>{formatPlanWithValue(membership.plan)}</strong>
                  </div>
                  <div>
                    <span>AI 月额度</span>
                    <strong>{membership.assistant_monthly_quota ?? "—"}</strong>
                  </div>
                  <div>
                    <span>更新时间</span>
                    <strong>{formatTime(membership.updated_at ?? null)}</strong>
                  </div>
                </div>

                <form action={updateMembershipAction} className="admin-edit-form">
                  <input type="hidden" name="membershipUserId" value={membership.user_id} />

                  <label className="form-field">
                    <span>状态</span>
                    <select name="status" defaultValue={membership.status ?? ""}>
                      <option value="">空</option>
                      <option value="guest">访客</option>
                      <option value="inactive">未启用</option>
                      <option value="active">已启用</option>
                    </select>
                  </label>

                  <label className="form-field">
                    <span>方案</span>
                    <input name="plan" type="text" defaultValue={membership.plan ?? ""} placeholder="例如：free / pro / core / vip" />
                    <small>常见显示：免费版（free）/ 专业版（pro）/ 核心版（core）/ VIP（vip）</small>
                  </label>

                  <label className="form-field">
                    <span>AI 月额度（assistant_monthly_quota）</span>
                    <input
                      name="assistantMonthlyQuota"
                      type="number"
                      min="0"
                      step="1"
                      defaultValue={membership.assistant_monthly_quota ?? ""}
                      placeholder="例如：30"
                    />
                  </label>

                  <div className="admin-edit-form__actions">
                    <button type="submit" className="button button--primary">
                      保存修改
                    </button>
                  </div>
                </form>
              </article>
            ))
          ) : (
            <div className="admin-empty-state">暂无会员数据。</div>
          )}
        </div>
      </section>
    </main>
  );
}

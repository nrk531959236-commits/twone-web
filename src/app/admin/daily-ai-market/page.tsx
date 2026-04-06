import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { createSupabaseAdminClient, getAdminAccess } from "@/lib/admin";
import { getFallbackDailyAiMarketAnalysis, type DailyAiMarketRecord } from "@/lib/daily-ai-market";
import { upsertDailyAiMarketAction } from "./actions";

export const metadata: Metadata = {
  title: "每日 AI 行情发布台 | Twone Web3.0 Community",
  description: "Twone 每日 AI 行情分析发布入口：写入 Supabase 并让首页读取最新 published 内容。",
};

function formatForDatetimeLocal(value: string) {
  const date = new Date(value);
  const pad = (num: number) => String(num).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatDateInput(value: string) {
  return value.slice(0, 10);
}

function listToTextarea(value: string[]) {
  return value.join("\n");
}

function getFlashTypeClassName(type: string | undefined) {
  switch (type) {
    case "success":
      return "form-status form-status--success";
    case "error":
      return "form-status form-status--error";
    default:
      return "form-status";
  }
}

async function getLatestRecords() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("daily_ai_market_analyses")
    .select("id, slug, analysis_date, publish_at_jst, status, source, payload, created_at, updated_at, published_at")
    .order("analysis_date", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(6);

  if (error) {
    const message = String(error.message ?? "").toLowerCase();
    if (message.includes("does not exist") || message.includes("relation") || message.includes("schema cache")) {
      return [] as DailyAiMarketRecord[];
    }

    throw error;
  }

  return (data ?? []) as DailyAiMarketRecord[];
}

export default async function AdminDailyAiMarketPage({
  searchParams,
}: {
  searchParams?: Promise<{ type?: string; message?: string }>;
}) {
  const access = await getAdminAccess();

  if (!access.user || !access.isAdmin) {
    return (
      <main className="page-shell">
        <SiteHeader />
        <section className="section hero page-hero">
          <div className="hero__badge">后台访问 · 受限</div>
          <div className="hero__grid">
            <div className="hero__content">
              <p className="eyebrow">当前账号不在后台白名单内</p>
              <h1>每日 AI 行情发布台暂未对该账号开放。</h1>
              <p className="hero__description">请先用管理员账号登录 /admin-login，再从后台进入这里。</p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const flashMessage = resolvedSearchParams?.message?.trim() || null;
  const flashType = resolvedSearchParams?.type?.trim();
  const latestRecords = await getLatestRecords();
  const latestRecord = latestRecords[0] ?? null;
  const fallback = latestRecord?.payload ?? await getFallbackDailyAiMarketAnalysis();

  return (
    <main className="page-shell">
      <SiteHeader />

      <section className="section hero page-hero admin-hero">
        <div className="hero__badge">每日 AI 行情 · 发布台</div>
        <div className="hero__grid">
          <div className="hero__content">
            <p className="eyebrow">把首页数据源从 seed 切到正式可写入内容</p>
            <h1>Supabase 每日分析发布入口</h1>
            <p className="hero__description">
              这一版先做最小可用真链路：管理员可在这里手动生成 / 修改当日分析，也可由定时器调用 <code>/api/daily-ai-market/auto-publish</code>
              自动写入 <code>daily_ai_market_analyses</code>，首页与 <code>/api/daily-ai-market</code> 自动读取最新 <code>published</code> 版本。
            </p>
            <div className="hero__stats">
              <div>
                <strong>{latestRecords.length}</strong>
                <span>最近记录数</span>
              </div>
              <div>
                <strong>{latestRecord?.analysis_date ?? "暂无"}</strong>
                <span>最近一条日期</span>
              </div>
              <div>
                <strong>{latestRecord?.status ?? "seed"}</strong>
                <span>当前首页优先状态</span>
              </div>
            </div>
          </div>

          <aside className="hero__panel card-glow">
            <div className="panel__topline">
              <span className="status-dot" />
              当前链路
            </div>
            <div className="panel__list">
              <article>
                <span>写入</span>
                <strong>后台表单 → Supabase</strong>
              </article>
              <article>
                <span>读取</span>
                <strong>首页 / API → 最新 published</strong>
              </article>
              <article>
                <span>下一步</span>
                <strong>现在可直接调用 /api/daily-ai-market/auto-publish；再补一个 cron 调度，就能每天自动跑。</strong>
              </article>
            </div>
          </aside>
        </div>
      </section>

      {flashMessage ? (
        <section className="section admin-flash-section">
          <div className={getFlashTypeClassName(flashType)} role="status" aria-live="polite">
            {flashMessage}
          </div>
        </section>
      ) : null}

      <section className="section admin-section">
        <div className="section-heading admin-section__heading">
          <div>
            <p className="section__label">发布表单</p>
            <h2>固定模板字段</h2>
          </div>
          <p className="section__intro">字段结构保持兼容首页现有 UI：结论、偏向、关键位、开单建议、事件表、指标面板都在同一个 payload 里。</p>
        </div>

        <form action={upsertDailyAiMarketAction} className="admin-record-card daily-market-form">
          <div className="form-grid">
            <label className="form-field">
              <span>分析日期</span>
              <input name="analysisDate" type="date" defaultValue={latestRecord?.analysis_date ?? formatDateInput(fallback.publishAtJst)} required />
            </label>
            <label className="form-field">
              <span>发布时间（JST）</span>
              <input name="publishAtJst" type="datetime-local" defaultValue={formatForDatetimeLocal(fallback.publishAtJst)} required />
            </label>
            <label className="form-field">
              <span>状态</span>
              <select name="status" defaultValue="published">
                <option value="scheduled">scheduled</option>
                <option value="published">published</option>
              </select>
            </label>
            <label className="form-field">
              <span>来源</span>
              <select name="source" defaultValue="admin">
                <option value="admin">admin</option>
                <option value="auto">auto</option>
                <option value="manual-seed">manual-seed</option>
              </select>
            </label>
          </div>

          <div className="form-grid">
            <label className="form-field">
              <span>标题</span>
              <input name="title" defaultValue={fallback.title} />
            </label>
            <label className="form-field">
              <span>市场偏向</span>
              <select name="marketBias" defaultValue={fallback.marketBias}>
                <option value="偏多">偏多</option>
                <option value="中性偏多">中性偏多</option>
                <option value="震荡">震荡</option>
                <option value="中性偏空">中性偏空</option>
                <option value="偏空">偏空</option>
              </select>
            </label>
          </div>

          <div className="form-grid form-grid--single">
            <label className="form-field">
              <span>主标题（headline）</span>
              <textarea name="headline" rows={3} defaultValue={fallback.headline} />
            </label>
            <label className="form-field">
              <span>主结论（conviction）</span>
              <textarea name="conviction" rows={3} defaultValue={fallback.conviction} />
            </label>
            <label className="form-field">
              <span>摘要（summary）</span>
              <textarea name="summary" rows={6} defaultValue={fallback.summary} />
            </label>
          </div>

          <div className="form-grid form-grid--single">
            <label className="form-field">
              <span>timeframe</span>
              <textarea name="timeframe" rows={2} defaultValue={fallback.timeframe} />
            </label>
            <label className="form-field">
              <span>structure</span>
              <textarea name="structure" rows={3} defaultValue={fallback.structure} />
            </label>
            <label className="form-field">
              <span>VWAP 说明</span>
              <textarea name="vwap" rows={3} defaultValue={fallback.vwap} />
            </label>
            <label className="form-field">
              <span>MACD 说明</span>
              <textarea name="macd" rows={3} defaultValue={fallback.macd} />
            </label>
            <label className="form-field">
              <span>RSI 说明</span>
              <textarea name="rsi" rows={3} defaultValue={fallback.rsi} />
            </label>
          </div>

          <section className="daily-market-form__section">
            <div className="daily-market-form__section-head">
              <div>
                <p className="section__label">指标面板</p>
                <h3>4H / D / W</h3>
              </div>
            </div>
            <div className="daily-market-panel-grid">
              {fallback.indicatorPanels.map((panel, index) => (
                <article key={panel.timeframe} className="daily-market-mini-card">
                  <div className="form-grid">
                    <label className="form-field">
                      <span>timeframe</span>
                      <input name={`indicator_${index}_timeframe`} defaultValue={panel.timeframe} />
                    </label>
                    <label className="form-field">
                      <span>bias</span>
                      <select name={`indicator_${index}_bias`} defaultValue={panel.bias}>
                        <option value="bullish">bullish</option>
                        <option value="neutral">neutral</option>
                        <option value="bearish">bearish</option>
                      </select>
                    </label>
                    <label className="form-field">
                      <span>VWAP</span>
                      <input name={`indicator_${index}_vwap_value`} defaultValue={panel.vwap.value} />
                    </label>
                    <label className="form-field">
                      <span>VAL</span>
                      <input name={`indicator_${index}_vwap_val`} defaultValue={panel.vwap.val} />
                    </label>
                    <label className="form-field">
                      <span>VAH</span>
                      <input name={`indicator_${index}_vwap_vah`} defaultValue={panel.vwap.vah} />
                    </label>
                    <label className="form-field">
                      <span>VWAP stance</span>
                      <input name={`indicator_${index}_vwap_stance`} defaultValue={panel.vwap.stance} />
                    </label>
                    <label className="form-field">
                      <span>MACD direction</span>
                      <input name={`indicator_${index}_macd_direction`} defaultValue={panel.macd.direction} />
                    </label>
                    <label className="form-field">
                      <span>MACD divergence</span>
                      <input name={`indicator_${index}_macd_divergence`} defaultValue={panel.macd.divergence} />
                    </label>
                    <label className="form-field">
                      <span>MACD bias</span>
                      <select name={`indicator_${index}_macd_bias`} defaultValue={panel.macd.bias}>
                        <option value="bullish">bullish</option>
                        <option value="neutral">neutral</option>
                        <option value="bearish">bearish</option>
                      </select>
                    </label>
                    <label className="form-field">
                      <span>RSI value</span>
                      <input name={`indicator_${index}_rsi_value`} type="number" defaultValue={panel.rsi.value} />
                    </label>
                    <label className="form-field">
                      <span>RSI divergence</span>
                      <input name={`indicator_${index}_rsi_divergence`} defaultValue={panel.rsi.divergence} />
                    </label>
                    <label className="form-field">
                      <span>RSI bias</span>
                      <select name={`indicator_${index}_rsi_bias`} defaultValue={panel.rsi.bias}>
                        <option value="bullish">bullish</option>
                        <option value="neutral">neutral</option>
                        <option value="bearish">bearish</option>
                      </select>
                    </label>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <div className="form-grid">
            <label className="form-field">
              <span>关键位（每行一条）</span>
              <textarea name="keyLevels" rows={5} defaultValue={listToTextarea(fallback.keyLevels)} />
            </label>
            <label className="form-field">
              <span>focus（每行一条）</span>
              <textarea name="focus" rows={5} defaultValue={listToTextarea(fallback.focus)} />
            </label>
            <label className="form-field">
              <span>riskTips（每行一条）</span>
              <textarea name="riskTips" rows={5} defaultValue={listToTextarea(fallback.riskTips)} />
            </label>
          </div>

          <section className="daily-market-form__section">
            <div className="daily-market-form__section-head">
              <div>
                <p className="section__label">开单建议</p>
                <h3>短线 / 长线</h3>
              </div>
            </div>
            <div className="daily-market-panel-grid daily-market-panel-grid--two">
              {([
                ["short", fallback.tradeSetups.shortTerm],
                ["long", fallback.tradeSetups.longTerm],
              ] as const).map(([prefix, setup]) => (
                <article key={prefix} className="daily-market-mini-card">
                  <div className="form-grid form-grid--single">
                    <label className="form-field">
                      <span>label</span>
                      <input name={`${prefix}_label`} defaultValue={setup.label} />
                    </label>
                    <label className="form-field">
                      <span>stance</span>
                      <input name={`${prefix}_stance`} defaultValue={setup.stance} />
                    </label>
                    <label className="form-field">
                      <span>direction</span>
                      <input name={`${prefix}_direction`} defaultValue={setup.direction} />
                    </label>
                    <label className="form-field">
                      <span>rationale</span>
                      <textarea name={`${prefix}_rationale`} rows={4} defaultValue={setup.rationale} />
                    </label>
                    <label className="form-field">
                      <span>triggerZone</span>
                      <textarea name={`${prefix}_triggerZone`} rows={2} defaultValue={setup.triggerZone} />
                    </label>
                    <label className="form-field">
                      <span>stopLoss</span>
                      <textarea name={`${prefix}_stopLoss`} rows={2} defaultValue={setup.stopLoss} />
                    </label>
                    <label className="form-field">
                      <span>targets（每行一条）</span>
                      <textarea name={`${prefix}_targets`} rows={4} defaultValue={listToTextarea(setup.targets)} />
                    </label>
                    <label className="form-field">
                      <span>invalidation</span>
                      <textarea name={`${prefix}_invalidation`} rows={3} defaultValue={setup.invalidation} />
                    </label>
                    <label className="form-field">
                      <span>executionLine</span>
                      <textarea name={`${prefix}_executionLine`} rows={3} defaultValue={setup.executionLine} />
                    </label>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="daily-market-form__section">
            <div className="daily-market-form__section-head">
              <div>
                <p className="section__label">宏观事件</p>
                <h3>事件表</h3>
              </div>
            </div>
            <div className="daily-market-panel-grid daily-market-panel-grid--three">
              {fallback.macroEvents.map((event, index) => (
                <article key={event.name} className="daily-market-mini-card">
                  <div className="form-grid form-grid--single">
                    <label className="form-field">
                      <span>name</span>
                      <input name={`event_${index}_name`} defaultValue={event.name} />
                    </label>
                    <label className="form-field">
                      <span>nextTimeJst</span>
                      <input name={`event_${index}_nextTimeJst`} defaultValue={event.nextTimeJst} />
                    </label>
                    <label className="form-field">
                      <span>status</span>
                      <select name={`event_${index}_status`} defaultValue={event.status}>
                        <option value="待公布">待公布</option>
                        <option value="已排期">已排期</option>
                      </select>
                    </label>
                    <label className="form-field">
                      <span>current</span>
                      <input name={`event_${index}_current`} defaultValue={event.current} />
                    </label>
                    <label className="form-field">
                      <span>forecast</span>
                      <input name={`event_${index}_forecast`} defaultValue={event.forecast} />
                    </label>
                    <label className="form-field">
                      <span>previous</span>
                      <input name={`event_${index}_previous`} defaultValue={event.previous} />
                    </label>
                    <label className="form-field">
                      <span>note</span>
                      <textarea name={`event_${index}_note`} rows={4} defaultValue={event.note} />
                    </label>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <div className="admin-edit-form__actions daily-market-form__actions">
            <button type="submit" className="button button--primary">保存 / 发布到 Supabase</button>
            <p>保存后首页会自动优先读取最新 published 版本；如果表还没建，会需要先执行本次新增 SQL。</p>
          </div>
        </form>
      </section>

      <section className="section admin-section">
        <div className="section-heading admin-section__heading">
          <div>
            <p className="section__label">最近记录</p>
            <h2>Supabase 写入结果</h2>
          </div>
          <p className="section__intro">方便确认首页当前会吃到哪一条 published 记录，以及最近是否成功写入。</p>
        </div>

        <div className="admin-card-list">
          {latestRecords.length ? (
            latestRecords.map((record) => (
              <article key={record.id} className="admin-record-card">
                <div className="admin-record-card__top">
                  <div>
                    <h3>{record.analysis_date}</h3>
                    <p>{record.slug}</p>
                  </div>
                  <div className="admin-record-card__meta">
                    <span>{record.status}</span>
                    <span>{record.source}</span>
                    <span>{record.publish_at_jst}</span>
                  </div>
                </div>
                <div className="admin-record-card__body">
                  <div>
                    <span>headline</span>
                    <p>{record.payload?.headline ?? "—"}</p>
                  </div>
                  <div>
                    <span>summary</span>
                    <p>{record.payload?.summary ?? "—"}</p>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="admin-empty-state">当前还没有 daily_ai_market_analyses 数据。先执行 SQL，再用上面的表单写入第一条。</div>
          )}
        </div>
      </section>
    </main>
  );
}

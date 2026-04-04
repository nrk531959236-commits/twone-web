"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const focusOptions = [
  "BTC / ETH 主流趋势交易",
  "山寨轮动与热点叙事",
  "链上数据 / 聪明钱跟踪",
  "交易系统 / 风控 / 复盘",
  "宏观与资金流向观察",
  "AI 研究工具与自动化",
];

const experienceTags = ["0-6个月", "6-12个月", "1-3年", "3年以上", "全职交易 / 研究"];

type WantsAiOption = "true" | "false" | "";

type FormState = {
  nickname: string;
  contact: string;
  region: string;
  identity: string;
  tradingExperience: string;
  reason: string;
  focusAreas: string[];
  wantsAi: WantsAiOption;
  budget: string;
  notes: string;
};

const initialState: FormState = {
  nickname: "",
  contact: "",
  region: "",
  identity: "",
  tradingExperience: "",
  reason: "",
  focusAreas: [],
  wantsAi: "",
  budget: "",
  notes: "",
};

type SubmitStatus = {
  type: "success" | "error";
  message: string;
  debug?: string;
};

function formatSupabaseError(error: unknown) {
  if (!error || typeof error !== "object") {
    return { message: "未知错误", debug: "No structured error returned." };
  }

  const maybeError = error as {
    message?: string;
    details?: string | null;
    hint?: string | null;
    code?: string | null;
  };

  const message = maybeError.message?.trim() || "Supabase 返回了未知错误";
  const debugParts = [
    maybeError.code ? `code=${maybeError.code}` : null,
    maybeError.details ? `details=${maybeError.details}` : null,
    maybeError.hint ? `hint=${maybeError.hint}` : null,
  ].filter(Boolean);

  return {
    message,
    debug: debugParts.length ? debugParts.join(" | ") : "No extra error details.",
  };
}

export function ApplyForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<SubmitStatus | null>(null);

  const normalizedContact = form.contact.trim();
  const isValidLoginEmail = EMAIL_PATTERN.test(normalizedContact);

  const canSubmit = useMemo(() => {
    return Boolean(
      form.nickname.trim() &&
        isValidLoginEmail &&
        form.region.trim() &&
        form.identity.trim() &&
        form.tradingExperience &&
        form.reason.trim() &&
        form.wantsAi &&
        form.budget,
    );
  }, [form, isValidLoginEmail]);

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const toggleFocusArea = (value: string) => {
    setForm((current) => {
      const exists = current.focusAreas.includes(value);

      return {
        ...current,
        focusAreas: exists
          ? current.focusAreas.filter((item) => item !== value)
          : [...current.focusAreas, value],
      };
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);

    if (!normalizedContact) {
      setStatus({ type: "error", message: "请先填写你登录 Twone 时使用的邮箱。" });
      return;
    }

    if (!isValidLoginEmail) {
      setStatus({ type: "error", message: "请输入有效的登录邮箱格式，非邮箱地址不能提交申请。" });
      return;
    }

    if (!canSubmit) {
      setStatus({ type: "error", message: "请先补齐必填项，再提交申请。" });
      return;
    }

    setIsSubmitting(true);

    const payload = {
      nickname: form.nickname.trim(),
      contact: normalizedContact,
      region: form.region.trim(),
      identity: form.identity.trim(),
      trading_experience: form.tradingExperience,
      reason: form.reason.trim(),
      focus_areas: form.focusAreas,
      wants_ai: form.wantsAi === "true",
      budget: form.budget,
      notes: form.notes.trim() || null,
      review_status: "pending",
    };

    console.log("[apply] inserting member_application", payload);

    try {
      const { error } = await supabase.from("member_applications").insert(payload);

      if (error) {
        const formattedError = formatSupabaseError(error);

        console.error("[apply] supabase insert failed", {
          payload,
          error,
          formattedError,
        });

        setStatus({
          type: "error",
          message: `提交失败：${formattedError.message}`,
          debug: formattedError.debug,
        });
        return;
      }

      const successMessage = "申请已提交成功。审核通过后，默认可获得 Free 体验版与 2 次 AI 对话。";

      setStatus({ type: "success", message: successMessage });
      setForm(initialState);
      router.push(`/apply/success?status=${encodeURIComponent(successMessage)}`);
      return;
    } catch (error) {
      const formattedError = formatSupabaseError(error);

      console.error("[apply] unexpected submit error", {
        payload,
        error,
        formattedError,
      });

      setStatus({
        type: "error",
        message: `提交失败：${formattedError.message}`,
        debug: formattedError.debug,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="application-form card-glow" onSubmit={handleSubmit}>
      <div className="form-grid">
        <label className="form-field">
          <span>昵称 *</span>
          <input
            type="text"
            placeholder="例如：Twone Alpha"
            value={form.nickname}
            onChange={(event) => updateField("nickname", event.target.value)}
          />
        </label>
        <label className="form-field">
          <span>登录邮箱 *</span>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="请填写你登录 Twone 时使用的邮箱"
            value={form.contact}
            onChange={(event) => updateField("contact", event.target.value)}
          />
          <small>系统会按这个登录邮箱同步审核结果；审核通过后默认发放 Free 体验版 + 2 次 AI 对话。之后你只需用同一个邮箱登录 Twone，资格就会自动生效；不是邮箱将无法提交。</small>
        </label>
        <label className="form-field">
          <span>所在地区 *</span>
          <input
            type="text"
            placeholder="例如：东京 / 上海 / 新加坡"
            value={form.region}
            onChange={(event) => updateField("region", event.target.value)}
          />
        </label>
        <label className="form-field">
          <span>当前身份 *</span>
          <input
            type="text"
            placeholder="学生 / 从业者 / 交易员 / 创业者"
            value={form.identity}
            onChange={(event) => updateField("identity", event.target.value)}
          />
        </label>
      </div>

      <div className="form-section">
        <div className="form-section__header">
          <h3>交易经验 *</h3>
          <p>选择更接近你的阶段，便于后续内容、社群与 Free Trial 体验反馈匹配。</p>
        </div>
        <div className="tag-list">
          {experienceTags.map((tag) => {
            const isActive = form.tradingExperience === tag;

            return (
              <button
                type="button"
                className={`tag-pill ${isActive ? "tag-pill--active" : ""}`}
                key={tag}
                onClick={() => updateField("tradingExperience", tag)}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      <div className="form-grid form-grid--single">
        <label className="form-field">
          <span>加入原因 *</span>
          <textarea
            rows={5}
            placeholder="你希望从社群、研究、课程或连接中获得什么？也可以说说你当前最大的瓶颈。"
            value={form.reason}
            onChange={(event) => updateField("reason", event.target.value)}
          />
        </label>
        <label className="form-field">
          <span>重点关注方向</span>
          <textarea
            rows={4}
            placeholder="例如：BTC 趋势、山寨轮动、链上追踪、宏观驱动、交易系统、风险控制等。"
            value={form.focusAreas.join("、")}
            onChange={(event) =>
              updateField(
                "focusAreas",
                event.target.value
                  .split(/[,，、\n]/)
                  .map((item) => item.trim())
                  .filter(Boolean),
              )
            }
          />
        </label>
      </div>

      <div className="form-section">
        <div className="form-section__header">
          <h3>关注主题</h3>
          <p>可多选，提交时会一并写入你的申请记录，也方便后续定向开放更合适的试用内容。</p>
        </div>
        <div className="tag-list">
          {focusOptions.map((tag) => {
            const isActive = form.focusAreas.includes(tag);

            return (
              <button
                type="button"
                className={`tag-pill ${isActive ? "tag-pill--active" : ""}`}
                key={tag}
                onClick={() => toggleFocusArea(tag)}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      <div className="form-grid">
        <label className="form-field">
          <span>是否想使用 AI 助手 *</span>
          <select
            value={form.wantsAi}
            onChange={(event) => updateField("wantsAi", event.target.value as WantsAiOption)}
          >
            <option value="" disabled>
              请选择
            </option>
            <option value="true">想，重点想用来做研究/复盘</option>
            <option value="true">可以了解，但不是刚需</option>
            <option value="false">暂时不需要</option>
          </select>
        </label>
        <label className="form-field">
          <span>预算预期 *</span>
          <select value={form.budget} onChange={(event) => updateField("budget", event.target.value)}>
            <option value="" disabled>
              请选择区间
            </option>
            <option value="入门会员">入门会员</option>
            <option value="核心会员">核心会员</option>
            <option value="高阶 / 小圈层">高阶 / 小圈层</option>
          </select>
        </label>
      </div>

      <label className="form-field">
        <span>补充说明</span>
        <textarea
          rows={4}
          placeholder="你也可以补充自己的交易风格、擅长方向或希望得到的资源。"
          value={form.notes}
          onChange={(event) => updateField("notes", event.target.value)}
        />
      </label>

      <div className="form-actions">
        <button type="submit" className="button button--primary" disabled={isSubmitting}>
          {isSubmitting ? "提交中..." : "提交申请"}
        </button>
        <p>
          {isSubmitting
            ? "正在写入申请数据，请稍候。"
            : "提交后将进入人工筛选流程；审核通过默认发放 Free 体验版与 2 次 AI 对话，请确认填写的是你登录 Twone 时使用的邮箱，之后用同一邮箱登录即可自动生效。"}
        </p>
      </div>

      {status ? (
        <div
          className={`form-status ${status.type === "success" ? "form-status--success" : "form-status--error"}`}
          role="status"
          aria-live="polite"
        >
          <div>{status.message}</div>
          {status.debug ? (
            <div style={{ marginTop: 8, fontSize: 12, lineHeight: 1.6, opacity: 0.8, wordBreak: "break-word" }}>
              {status.debug}
            </div>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}

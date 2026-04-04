import Link from "next/link";
import type { MembershipSummary } from "@/lib/membership";

type AssistantEntryCardProps = {
  membership: MembershipSummary;
  entryMode: "login" | "assistant";
  canUseAssistant: boolean;
};

function getEntryCopy(membership: MembershipSummary, entryMode: "login" | "assistant", canUseAssistant: boolean) {
  if (!membership.isAuthenticated) {
    return entryMode === "login"
      ? {
          label: "Member Sign-in",
          title: "先登录已有会员账号",
          description:
            "如果你已经通过审核并开通 Free 体验版或其他会员方案，现在可以直接用申请时的邮箱 + 密码登录。登录后系统会自动校验状态，并自动兑现该邮箱对应的资格，再把你带回 AI 助手入口。",
          primaryHref: "#member-login",
          primaryText: "已有账号，立即登录",
          secondaryHref: "/apply",
          secondaryText: "还没申请，先去申请",
        }
      : {
          label: "AI Copilot Access",
          title: "AI 助手目前优先面向已通过审核的 Free 体验用户开放",
          description:
            "未申请或未登录用户可以先浏览页面说明，但不会直接进入可发送状态。先提交申请；如果你已经有账号，也可以直接用邮箱 + 密码登录。审核通过后默认会获得 Free 体验版与 2 次 AI 对话。",
          primaryHref: "/apply",
          primaryText: "先申请加入",
          secondaryHref: "#member-login",
          secondaryText: "已有账号，去登录",
        };
  }

  if (!membership.isMember) {
    if (membership.isPending) {
      return {
        label: "Pending Review",
        title: "你的申请正在审核中",
        description:
          "当前登录邮箱已匹配到待审核申请。AI 助手暂时保持只读，无需重复提交；请等待审核完成，并继续使用申请时填写的同一邮箱登录。审核通过后，资格会自动生效。",
        primaryHref: "/apply/success",
        primaryText: "查看审核说明",
        secondaryHref: "/auth/reset-password",
        secondaryText: "我是老用户，去补密码",
      };
    }

    return {
      label: "Membership Required",
      title: "已登录，但当前账号还没开通体验资格",
      description:
        "你已经拿到登录会话，但系统没有识别到有效体验资格，所以 AI 助手仍保持只读。若还未申请，先补申请；若你已通过审核但仍被拦截，请确认当前登录的就是审核通过时填写的邮箱。老用户如果以前只用邮箱链接，现在也可以先去补一个密码。默认审批会发放 Free 体验版与 2 次 AI 对话，并按该邮箱自动兑现。",
      primaryHref: "/apply",
      primaryText: "去提交申请",
      secondaryHref: "#member-login",
      secondaryText: "换已有会员账号登录",
    };
  }

  if (!canUseAssistant) {
    return {
      label: "Quota Status",
      title: "体验资格已生效，但当前 AI 使用额度不可用",
      description:
        "你的体验状态正常，但当前月度 AI 对话额度已经耗尽。Free 体验版默认只有 2 次；页面不会再把你带去报错，而是直接停留在说明与额度状态。",
      primaryHref: "#quota-panel",
      primaryText: "查看当前额度",
      secondaryHref: "/apply",
      secondaryText: "了解会员方案",
    };
  }

  return {
    label: "Assistant Ready",
    title: "账号状态正常，可以直接使用 AI 助手",
    description: "当前账号已通过登录与资格校验。若你是默认审批通过用户，当前即为 Free 体验版，可直接开始 2 次 AI 对话体验。",
    primaryHref: "#assistant-chat",
    primaryText: "开始使用",
    secondaryHref: "/apply",
    secondaryText: "查看会员权益",
  };
}

export function AssistantEntryCard({ membership, entryMode, canUseAssistant }: AssistantEntryCardProps) {
  const copy = getEntryCopy(membership, entryMode, canUseAssistant);

  return (
    <section className="section card-glow assistant-entry-card">
      <div className="assistant-entry-card__content">
        <div>
          <p className="section__label">{copy.label}</p>
          <h2>{copy.title}</h2>
        </div>
        <p>{copy.description}</p>
      </div>

      <div className="hero__actions assistant-entry-card__actions">
        <Link href={copy.primaryHref} className="button button--primary">
          {copy.primaryText}
        </Link>
        <Link href={copy.secondaryHref} className="button button--ghost">
          {copy.secondaryText}
        </Link>
      </div>
    </section>
  );
}

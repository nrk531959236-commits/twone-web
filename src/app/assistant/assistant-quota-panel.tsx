"use client";

import { useEffect, useState } from "react";
import { fetchAssistantQuota } from "@/lib/assistant/runtime";
import type { AssistantQuotaView } from "@/lib/assistant/types";

type AssistantQuotaPanelProps = {
  initialQuota: AssistantQuotaView;
  initialCanUseAssistant: boolean;
  membershipPlan: string;
  membershipActive: boolean;
};

export function AssistantQuotaPanel({
  initialQuota,
  initialCanUseAssistant,
  membershipPlan,
  membershipActive,
}: AssistantQuotaPanelProps) {
  const [quota, setQuota] = useState<AssistantQuotaView>(initialQuota);
  const [canUseAssistant, setCanUseAssistant] = useState(initialCanUseAssistant);

  useEffect(() => {
    function handleQuotaUpdate(event: Event) {
      const customEvent = event as CustomEvent<{ quota: AssistantQuotaView; canUseAssistant: boolean }>;
      if (!customEvent.detail) {
        return;
      }

      setQuota(customEvent.detail.quota);
      setCanUseAssistant(customEvent.detail.canUseAssistant);
    }

    window.addEventListener("assistant-quota-updated", handleQuotaUpdate as EventListener);

    return () => {
      window.removeEventListener("assistant-quota-updated", handleQuotaUpdate as EventListener);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function syncQuota() {
      try {
        const latestQuota = await fetchAssistantQuota();

        if (cancelled) {
          return;
        }

        setQuota(latestQuota);
        setCanUseAssistant(membershipActive && latestQuota.monthlyRemaining > 0);
      } catch {
        // ignore background sync failure
      }
    }

    void syncQuota();

    return () => {
      cancelled = true;
    };
  }, [membershipActive]);

  const quotaCards = [
    {
      label: "当前 AI 对话额度",
      value: `${quota.monthlyRemaining} / ${quota.monthlyQuota}`,
      detail: `已用 ${quota.monthlyUsed} 次 · 周期 ${quota.currentPeriod}`,
    },
    {
      label: "当前方案",
      value: membershipPlan,
      detail: membershipActive ? "资格有效，可继续使用" : "当前未开通或已过期",
    },
    {
      label: "额度状态",
      value: canUseAssistant ? "Available" : "Locked",
      detail: quota.quotaMessage,
    },
  ];

  return (
    <div className="quota-grid">
      {quotaCards.map((item) => (
        <article className="quota-card" key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          <p>{item.detail}</p>
        </article>
      ))}
    </div>
  );
}

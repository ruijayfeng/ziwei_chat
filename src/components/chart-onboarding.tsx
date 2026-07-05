"use client";

/**
 * [INPUT]: Depends on React form events, CreateChartInput domain shape, and chart profile UI helpers
 * [OUTPUT]: Provides current chart/profile summary, edit form, save, and reset controls
 * [POS]: Profile management component beside chat-panel, topic-entry, and evidence-drawer
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import type { CreateChartInput } from "@/lib/domain/chart";
import { formatChartProfile, getChartSyncLabel } from "@/lib/ui/chart-profile";
import { RotateCcw, Save, UserRound } from "lucide-react";

type ChartOnboardingProps = {
  profileId: string;
  chartInput: CreateChartInput | null;
  chartSynced: boolean;
  onChartReady: (chart: CreateChartInput) => void;
  onResetChart: () => void;
};

export function ChartOnboarding({
  profileId,
  chartInput,
  chartSynced,
  onChartReady,
  onResetChart,
}: ChartOnboardingProps) {
  function handleSubmit(formData: FormData) {
    onChartReady({
      profileId,
      name: String(formData.get("name") || "我的命盘"),
      gender: String(formData.get("gender")) === "female" ? "female" : "male",
      birthDate: String(formData.get("birthDate") || ""),
      birthTime: String(formData.get("birthTime") || ""),
      calendarType:
        String(formData.get("calendarType")) === "lunar" ? "lunar" : "solar",
      birthPlace: String(formData.get("birthPlace") || ""),
      isPrimary: true,
    });
  }

  const profile = formatChartProfile(chartInput);
  const syncLabel = getChartSyncLabel(chartSynced, profile.hasChart);

  return (
    <section className="rounded-lg border border-border bg-surface p-4 shadow-[0_1px_0_rgba(24,24,22,0.04)]">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-success-muted text-primary">
          <UserRound size={18} strokeWidth={1.8} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted">当前命盘</p>
          <h2 className="mt-1 truncate text-base font-semibold text-foreground">
            {profile.title}
          </h2>
          <p className="mt-1 text-sm leading-5 text-muted">{profile.subtitle}</p>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-border bg-surface-muted/60 p-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-muted">同步状态</span>
          <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-primary">
            {syncLabel}
          </span>
        </div>

        {profile.details.length > 0 ? (
          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
            {profile.details.map((detail) => (
              <div key={detail.label}>
                <dt className="text-muted">{detail.label}</dt>
                <dd className="mt-0.5 truncate font-medium text-foreground">
                  {detail.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>

      <form action={handleSubmit} className="mt-5 grid gap-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">命盘资料</h3>
          <p className="mt-1 text-xs leading-5 text-muted">
            MVP 只保存一张主命盘，用当前浏览器的匿名 profile 关联对话。
          </p>
        </div>

        <div className="grid gap-3">
          <label className="grid gap-1.5 text-sm font-medium text-foreground">
            名称
            <input
              className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-primary"
              defaultValue={chartInput?.name ?? "我的命盘"}
              name="name"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium text-foreground">
              性别
              <select
                className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-primary"
                defaultValue={chartInput?.gender ?? "male"}
                name="gender"
              >
                <option value="male">男</option>
                <option value="female">女</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-foreground">
              历法
              <select
                className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-primary"
                defaultValue={chartInput?.calendarType ?? "solar"}
                name="calendarType"
              >
                <option value="solar">阳历</option>
                <option value="lunar">农历</option>
              </select>
            </label>
          </div>
          <label className="grid gap-1.5 text-sm font-medium text-foreground">
            出生日期
            <input
              className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-primary"
              defaultValue={chartInput?.birthDate ?? "1990-05-17"}
              name="birthDate"
              type="date"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-foreground">
            出生时间
            <input
              className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-primary"
              defaultValue={chartInput?.birthTime ?? "12:00"}
              name="birthTime"
              placeholder="HH:mm 或时辰"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-foreground">
            出生地
            <input
              className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-primary"
              defaultValue={chartInput?.birthPlace ?? ""}
              name="birthPlace"
              placeholder="可选"
            />
          </label>
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-2">
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-strong active:translate-y-px"
            type="submit"
          >
            <Save size={16} strokeWidth={1.8} />
            保存命盘
          </button>
          <button
            className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-surface px-3 text-muted transition hover:border-warning hover:text-warning active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!chartInput}
            onClick={onResetChart}
            title="重置当前命盘"
            type="button"
          >
            <RotateCcw size={16} strokeWidth={1.8} />
          </button>
        </div>
      </form>
    </section>
  );
}

"use client";

/**
 * [INPUT]: Depends on React form events and CreateChartInput domain shape
 * [OUTPUT]: Provides primary chart onboarding form state to the app shell
 * [POS]: First-use chart capture component beside chat-panel and topic-entry
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import type { CreateChartInput } from "@/lib/domain/chart";

type ChartOnboardingProps = {
  profileId: string;
  chartInput: CreateChartInput | null;
  onChartReady: (chart: CreateChartInput) => void;
};

export function ChartOnboarding({
  profileId,
  chartInput,
  onChartReady,
}: ChartOnboardingProps) {
  function handleSubmit(formData: FormData) {
    onChartReady({
      profileId,
      name: String(formData.get("name") || "Primary chart"),
      gender: String(formData.get("gender")) === "female" ? "female" : "male",
      birthDate: String(formData.get("birthDate") || ""),
      birthTime: String(formData.get("birthTime") || ""),
      calendarType:
        String(formData.get("calendarType")) === "lunar" ? "lunar" : "solar",
      birthPlace: String(formData.get("birthPlace") || ""),
      isPrimary: true,
    });
  }

  return (
    <form action={handleSubmit} className="grid gap-4">
      <div>
        <h2 className="text-lg font-semibold text-zinc-950">创建主命盘</h2>
        <p className="mt-1 max-w-prose text-sm leading-6 text-zinc-600">
          首版只保存一张主命盘，用匿名 profile 关联会话，不需要登录。
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium text-zinc-700">
          名称
          <input
            className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-zinc-950 outline-none focus:border-teal-700"
            defaultValue={chartInput?.name ?? "我的命盘"}
            name="name"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-zinc-700">
          性别
          <select
            className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-zinc-950 outline-none focus:border-teal-700"
            defaultValue={chartInput?.gender ?? "male"}
            name="gender"
          >
            <option value="male">男</option>
            <option value="female">女</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-zinc-700">
          出生日期
          <input
            className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-zinc-950 outline-none focus:border-teal-700"
            defaultValue={chartInput?.birthDate ?? "1990-05-17"}
            name="birthDate"
            type="date"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-zinc-700">
          出生时间
          <input
            className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-zinc-950 outline-none focus:border-teal-700"
            defaultValue={chartInput?.birthTime ?? "12:00"}
            name="birthTime"
            placeholder="HH:mm 或 午"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-zinc-700">
          历法
          <select
            className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-zinc-950 outline-none focus:border-teal-700"
            defaultValue={chartInput?.calendarType ?? "solar"}
            name="calendarType"
          >
            <option value="solar">阳历</option>
            <option value="lunar">农历</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-zinc-700">
          出生地
          <input
            className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-zinc-950 outline-none focus:border-teal-700"
            defaultValue={chartInput?.birthPlace ?? ""}
            name="birthPlace"
            placeholder="可选"
          />
        </label>
      </div>

      <button className="h-10 rounded-md bg-teal-800 px-4 text-sm font-semibold text-white transition hover:bg-teal-900">
        保存主命盘
      </button>
    </form>
  );
}

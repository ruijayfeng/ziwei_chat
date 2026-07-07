"use client";

/**
 * [INPUT]: Depends on React form events, CreateChartInput domain shape, shadcn UI primitives, and chart profile UI helpers
 * [OUTPUT]: Provides current chart/profile summary, edit form, save, and reset controls
 * [POS]: Profile management component beside chat-panel, topic-entry, and evidence-drawer
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import type { CreateChartInput } from "@/lib/domain/chart";
import { formatChartProfile, getChartSyncLabel } from "@/lib/ui/chart-profile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { RotateCcw, Save, UserRound } from "lucide-react";

type ChartOnboardingProps = {
  profileId: string;
  chartInput: CreateChartInput | null;
  chartSynced: boolean;
  onChartReady: (chart: CreateChartInput) => void;
  onResetChart: () => void;
};

const genderItems = {
  male: "男",
  female: "女",
};

const calendarItems = {
  solar: "阳历",
  lunar: "农历",
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
    <Card className="border-border/90 bg-card shadow-none ring-0" size="sm">
      <CardHeader className="gap-3">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
            <UserRound size={18} strokeWidth={1.8} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground">当前命盘</p>
            <CardTitle className="mt-1 truncate text-base font-semibold">
              {profile.title}
            </CardTitle>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              {profile.subtitle}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2">
          <span className="text-xs font-medium text-muted-foreground">同步状态</span>
          <Badge className="bg-card text-primary" variant="outline">
            {syncLabel}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {profile.details.length > 0 ? (
          <>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
              {profile.details.map((detail) => (
                <div key={detail.label} className="min-w-0">
                  <dt className="text-muted-foreground">{detail.label}</dt>
                  <dd className="mt-0.5 truncate font-medium text-foreground">
                    {detail.value}
                  </dd>
                </div>
              ))}
            </dl>
            <Separator />
          </>
        ) : null}

        <form action={handleSubmit} className="grid gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">命盘资料</h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Beta 只保存一张主命盘，并用当前浏览器的匿名 profile 关联对话。
            </p>
          </div>

          <Field label="名称">
            <Input defaultValue={chartInput?.name ?? "我的命盘"} name="name" />
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="性别">
              <Select
                defaultValue={chartInput?.gender ?? "male"}
                items={genderItems}
                name="gender"
              >
                <SelectTrigger className="w-full bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">男</SelectItem>
                  <SelectItem value="female">女</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="历法">
              <Select
                defaultValue={chartInput?.calendarType ?? "solar"}
                items={calendarItems}
                name="calendarType"
              >
                <SelectTrigger className="w-full bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="solar">阳历</SelectItem>
                  <SelectItem value="lunar">农历</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="出生日期">
            <Input
              defaultValue={chartInput?.birthDate ?? "1990-05-17"}
              name="birthDate"
              type="date"
            />
          </Field>
          <Field label="出生时间">
            <Input
              defaultValue={chartInput?.birthTime ?? "12:00"}
              name="birthTime"
              placeholder="HH:mm 或时辰"
            />
          </Field>
          <Field label="出生地">
            <Input
              defaultValue={chartInput?.birthPlace ?? ""}
              name="birthPlace"
              placeholder="可选"
            />
          </Field>

          <div className="grid grid-cols-[1fr_auto] gap-2 pt-1">
            <Button className="bg-primary hover:bg-primary-strong" type="submit">
              <Save data-icon="inline-start" />
              保存命盘
            </Button>
            <Button
              disabled={!chartInput}
              onClick={onResetChart}
              size="icon"
              title="重置当前命盘"
              type="button"
              variant="outline"
            >
              <RotateCcw />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-foreground">
      {label}
      {children}
    </label>
  );
}

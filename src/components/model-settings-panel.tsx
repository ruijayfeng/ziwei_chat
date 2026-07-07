"use client";

/**
 * [INPUT]: Depends on model settings UI helpers and shadcn form primitives
 * [OUTPUT]: Provides browser-local model provider, Base URL, API key, and model configuration controls
 * [POS]: Workspace panel component beside chart onboarding and topic entry
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import { KeyRound, Settings2 } from "lucide-react";

import {
  modelProviderDefaults,
  modelProviderOptions,
  modelSettingsDraftForProvider,
  modelSettingsStatus,
  type ModelProviderOption,
  type ModelSettingsDraft,
} from "@/lib/ui/model-settings";
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

type ModelSettingsPanelProps = {
  value: ModelSettingsDraft;
  onChange: (value: ModelSettingsDraft) => void;
};

export function ModelSettingsPanel({ value, onChange }: ModelSettingsPanelProps) {
  const enabled = value.provider !== "deterministic-local";
  const status = modelSettingsStatus(value);

  function update(partial: Partial<ModelSettingsDraft>) {
    onChange({ ...value, ...partial });
  }

  function applyProvider(provider: ModelProviderOption) {
    onChange(modelSettingsDraftForProvider(value, provider));
  }

  return (
    <Card className="border-border/90 bg-card shadow-none ring-0" size="sm">
      <CardHeader className="gap-3">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
            <Settings2 size={18} strokeWidth={1.8} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground">Model</p>
            <CardTitle className="mt-1 text-base font-semibold">模型设置</CardTitle>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              API Key 只保存在当前浏览器，用于调试真实模型的流式回答。
            </p>
          </div>
          <Badge className={status.ready ? "bg-accent text-primary" : ""} variant="outline">
            {status.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="grid gap-3">
        <p className="rounded-lg bg-muted px-3 py-2 text-xs leading-5 text-muted-foreground">
          {status.description}
        </p>

        <Field label="提供商">
          <Select
            defaultValue={value.provider}
            items={providerItems}
            name="modelProvider"
            onValueChange={(nextValue) => applyProvider(nextValue as ModelProviderOption)}
          >
            <SelectTrigger className="w-full bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {modelProviderOptions.map((provider) => (
                <SelectItem key={provider.value} value={provider.value}>
                  {provider.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {enabled ? (
          <>
            <Field label="Base URL">
              <Input
                name="modelBaseUrl"
                onChange={(event) => update({ baseUrl: event.target.value })}
                placeholder={providerPlaceholder(value.provider, "baseUrl")}
                value={value.baseUrl}
              />
            </Field>
            <Field label="API Key">
              <Input
                name="modelApiKey"
                onChange={(event) => update({ apiKey: event.target.value })}
                placeholder="sk-..."
                type="password"
                value={value.apiKey}
              />
            </Field>
            <Field label="Model">
              <Input
                name="modelName"
                onChange={(event) => update({ model: event.target.value })}
                placeholder={providerPlaceholder(value.provider, "model")}
                value={value.model}
              />
            </Field>
          </>
        ) : null}

        {enabled && value.apiKey ? (
          <Button
            onClick={() => onChange({ ...value, apiKey: "" })}
            size="sm"
            type="button"
            variant="outline"
          >
            <KeyRound data-icon="inline-start" />
            清空 API Key
          </Button>
        ) : null}
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

const providerItems = Object.fromEntries(
  modelProviderOptions.map((provider) => [provider.value, provider.label]),
) as Record<ModelProviderOption, string>;

function providerPlaceholder(
  provider: ModelProviderOption,
  field: keyof (typeof modelProviderDefaults)["openai"],
) {
  if (provider === "deterministic-local") return "";
  return modelProviderDefaults[provider][field];
}

"use client";

/**
 * [INPUT]: Depends on model settings UI helpers and shadcn form primitives
 * [OUTPUT]: Provides browser-local chat model and embedding model configuration controls
 * [POS]: Workspace panel component beside chart onboarding and topic entry
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import { KeyRound, Settings2 } from "lucide-react";

import {
  embeddingSettingsDraftForProvider,
  modelProviderDefaults,
  modelProviderOptions,
  modelSettingsDraftForProvider,
  modelSettingsStatus,
  type EmbeddingSettingsDraft,
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
  loaded: boolean;
  onChange: (value: ModelSettingsDraft) => void;
};

export function ModelSettingsPanel({ value, loaded, onChange }: ModelSettingsPanelProps) {
  const chatEnabled = value.provider !== "deterministic-local";
  const embeddingEnabled = value.embedding.provider !== "disabled";
  const status = loaded
    ? modelSettingsStatus(value)
    : {
        label: "读取中",
        description: "正在读取当前浏览器保存的模型设置。",
        missingFields: [],
        ready: false,
        embeddingReady: false,
      };

  function update(partial: Partial<ModelSettingsDraft>) {
    onChange({ ...value, ...partial });
  }

  function updateEmbedding(partial: Partial<EmbeddingSettingsDraft>) {
    onChange({ ...value, embedding: { ...value.embedding, ...partial } });
  }

  function applyProvider(provider: ModelProviderOption) {
    onChange(modelSettingsDraftForProvider(value, provider));
  }

  function applyEmbeddingProvider(provider: EmbeddingSettingsDraft["provider"]) {
    onChange({
      ...value,
      embedding: embeddingSettingsDraftForProvider(value.embedding, provider),
    });
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
              API Key 只保存在当前浏览器。回答模型负责分析与生成，Embedding 模型负责语义 RAG。
            </p>
          </div>
          <Badge className={status.ready ? "bg-accent text-primary" : ""} variant="outline">
            {status.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="grid gap-4">
        <p className="rounded-lg bg-muted px-3 py-2 text-xs leading-5 text-muted-foreground">
          {status.description}
        </p>

        <section className="grid gap-3">
          <div className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
            回答模型
          </div>
          <Field label="提供商">
            <Select
              disabled={!loaded}
              items={providerItems}
              name="modelProvider"
              onValueChange={(nextValue) => applyProvider(nextValue as ModelProviderOption)}
              value={value.provider}
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

          {chatEnabled ? (
            <>
              <Field label="Base URL">
                <Input
                  disabled={!loaded}
                  name="modelBaseUrl"
                  onChange={(event) => update({ baseUrl: event.target.value })}
                  placeholder={providerPlaceholder(value.provider, "baseUrl")}
                  value={value.baseUrl}
                />
              </Field>
              <Field label="API Key">
                <Input
                  disabled={!loaded}
                  name="modelApiKey"
                  onChange={(event) => update({ apiKey: event.target.value })}
                  placeholder="sk-..."
                  type="password"
                  value={value.apiKey}
                />
              </Field>
              <Field label="Model">
                <Input
                  disabled={!loaded}
                  name="modelName"
                  onChange={(event) => update({ model: event.target.value })}
                  placeholder={providerPlaceholder(value.provider, "model")}
                  value={value.model}
                />
              </Field>
            </>
          ) : null}

          {chatEnabled && value.apiKey ? (
            <Button
              disabled={!loaded}
              onClick={() => onChange({ ...value, apiKey: "" })}
              size="sm"
              type="button"
              variant="outline"
            >
              <KeyRound data-icon="inline-start" />
              清空回答 API Key
            </Button>
          ) : null}
        </section>

        <section className="grid gap-3 border-t border-border pt-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
              Embedding 模型
            </div>
            <Badge className={status.embeddingReady ? "bg-accent text-primary" : ""} variant="outline">
              {status.embeddingReady ? "已配置" : "可选"}
            </Badge>
          </div>

          <Field label="提供商">
            <Select
              disabled={!loaded}
              items={embeddingProviderItems}
              name="embeddingProvider"
              onValueChange={(nextValue) =>
                applyEmbeddingProvider(nextValue as EmbeddingSettingsDraft["provider"])
              }
              value={value.embedding.provider}
            >
              <SelectTrigger className="w-full bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="disabled">关闭</SelectItem>
                {modelProviderOptions
                  .filter((provider) => provider.value !== "deterministic-local")
                  .map((provider) => (
                    <SelectItem key={provider.value} value={provider.value}>
                      {provider.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </Field>

          {embeddingEnabled ? (
            <>
              <Field label="Embedding Base URL">
                <Input
                  disabled={!loaded}
                  name="embeddingBaseUrl"
                  onChange={(event) => updateEmbedding({ baseUrl: event.target.value })}
                  placeholder={embeddingPlaceholder(value.embedding.provider, "baseUrl")}
                  value={value.embedding.baseUrl}
                />
              </Field>
              <Field label="Embedding API Key">
                <Input
                  disabled={!loaded}
                  name="embeddingApiKey"
                  onChange={(event) => updateEmbedding({ apiKey: event.target.value })}
                  placeholder="sk-..."
                  type="password"
                  value={value.embedding.apiKey}
                />
              </Field>
              <Field label="Embedding Model">
                <Input
                  disabled={!loaded}
                  name="embeddingModel"
                  onChange={(event) => updateEmbedding({ model: event.target.value })}
                  placeholder={embeddingPlaceholder(value.embedding.provider, "embeddingModel")}
                  value={value.embedding.model}
                />
              </Field>
            </>
          ) : (
            <p className="rounded-lg bg-muted px-3 py-2 text-xs leading-5 text-muted-foreground">
              关闭时使用本地关键词 RAG；配置后可生成知识库 embedding 并启用语义检索。
            </p>
          )}

          {embeddingEnabled && value.embedding.apiKey ? (
            <Button
              disabled={!loaded}
              onClick={() => updateEmbedding({ apiKey: "" })}
              size="sm"
              type="button"
              variant="outline"
            >
              <KeyRound data-icon="inline-start" />
              清空 Embedding API Key
            </Button>
          ) : null}
        </section>
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

const embeddingProviderItems = {
  disabled: "关闭",
  ...Object.fromEntries(
    modelProviderOptions
      .filter((provider) => provider.value !== "deterministic-local")
      .map((provider) => [provider.value, provider.label]),
  ),
} as Record<EmbeddingSettingsDraft["provider"], string>;

function providerPlaceholder(
  provider: ModelProviderOption,
  field: keyof Pick<(typeof modelProviderDefaults)["openai"], "baseUrl" | "model">,
) {
  if (provider === "deterministic-local") return "";
  return modelProviderDefaults[provider][field];
}

function embeddingPlaceholder(
  provider: EmbeddingSettingsDraft["provider"],
  field: keyof Pick<(typeof modelProviderDefaults)["openai"], "baseUrl" | "embeddingModel">,
) {
  if (provider === "disabled") return "";
  return modelProviderDefaults[provider][field];
}

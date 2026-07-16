"use client";

import { AppLayout } from "@/components/app-layout";
import { ClearAnonymousDataDialog } from "@/components/clear-anonymous-data-dialog";
import { ModelSettingsPanel } from "@/components/model-settings-panel";
import { Button } from "@/components/ui/button";
import { PageHeader, RingGlyph } from "@/components/workspace/page-header";
import { useWorkspace } from "@/components/workspace/workspace-provider";

export default function SettingsPage() {
  const {
    modelSettings,
    modelSettingsLoaded,
    setModelSettings,
    deleteAnonymousData,
    dataDeleting,
    dataDeletionError,
  } = useWorkspace();

  return (
    <AppLayout inspector={null}>
      <div className="mx-auto w-full max-w-3xl py-8 lg:py-12">
        <PageHeader
          aside={<RingGlyph className="size-24 opacity-80" />}
          eyebrow="settings"
          subtitle="模型配置只保存在当前浏览器，用于连接 OpenAI 兼容服务。"
          title={<>连接你的模型服务</>}
        />

        <div className="mt-10">
          <ModelSettingsPanel loaded={modelSettingsLoaded} onChange={setModelSettings} value={modelSettings} />
        </div>

        <section className="surface mt-10 rounded-2xl p-6 sm:p-8">
          <h2 className="font-serif text-2xl font-medium">清除匿名资料</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
            命盘与对话会在当前浏览器保留；部署端配置数据库时，也可能为匿名 profile 持久化。确认后会同时请求服务端删除，再清理本地资料与模型设置。
          </p>
          {dataDeletionError ? <p className="mt-4 rounded-xl border border-destructive/35 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">{dataDeletionError}</p> : null}
          <div className="mt-5">
            <ClearAnonymousDataDialog
              deleting={dataDeleting}
              error={dataDeletionError}
              onConfirm={deleteAnonymousData}
              pendingLabel="正在清除…"
              trigger={<Button type="button" variant="outline" />}
              triggerContent="清除匿名资料"
            />
          </div>
        </section>
      </div>
    </AppLayout>
  );
}

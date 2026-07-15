"use client";

import { Trash2 } from "lucide-react";

import { ModelSettingsPanel } from "@/components/model-settings-panel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
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
    <section className="mx-auto max-w-3xl py-8">
      <p className="text-sm text-cinnabar">设置</p>
      <h1 className="mt-3 font-serif text-4xl font-bold">模型与匿名资料</h1>
      <p className="mt-4 max-w-2xl leading-7 text-muted-foreground">
        API Key 只保存在当前浏览器，并在发起分析时随请求发送；服务端不会把它写入数据库或日志。
      </p>
      <div className="mt-8">
        <ModelSettingsPanel loaded={modelSettingsLoaded} onChange={setModelSettings} value={modelSettings} />
      </div>

      <section className="mt-10 border-t border-border pt-8">
        <h2 className="font-serif text-2xl font-bold">清除匿名资料</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
          命盘与对话会在当前浏览器保留；部署端配置数据库时，也可能为匿名 profile 持久化。确认后会同时请求服务端删除，再清理本地资料与模型设置。
        </p>
        {dataDeletionError ? <p className="mt-4 rounded-xl border border-destructive/35 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">{dataDeletionError}</p> : null}
        <div className="mt-5"><ClearDataDialog disabled={dataDeleting} onConfirm={() => void deleteAnonymousData()} /></div>
      </section>
    </section>
  );
}

function ClearDataDialog({ disabled, onConfirm }: { disabled: boolean; onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button disabled={disabled} type="button" variant="outline" />}>
        <Trash2 data-icon="inline-start" />{disabled ? "正在清除…" : "清除匿名资料"}
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive"><Trash2 /></AlertDialogMedia>
          <AlertDialogTitle>清除当前匿名 profile 的资料？</AlertDialogTitle>
          <AlertDialogDescription>这会删除命盘、对话、运行记录与当前浏览器模型设置。Beta 没有产品账号，因此这不是账号注销。</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/85" onClick={onConfirm}>确认清除</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

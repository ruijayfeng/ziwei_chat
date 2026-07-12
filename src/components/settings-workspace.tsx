/**
 * [INPUT]: Depends on existing browser-local model settings and local-data action
 * [OUTPUT]: Provides the settings workspace without changing persistence behavior
 * [POS]: Main workspace view for model, retrieval, and privacy configuration
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import type { ModelSettingsDraft } from "@/lib/ui/model-settings";
import { ModelSettingsPanel } from "./model-settings-panel";

type SettingsWorkspaceProps = { value: ModelSettingsDraft; loaded: boolean; onChange: (next: ModelSettingsDraft) => void; localDataActions: React.ReactNode; };

export function SettingsWorkspace({ value, loaded, onChange, localDataActions }: SettingsWorkspaceProps) {
  return <section className="mx-auto grid w-full max-w-4xl gap-7 px-5 py-8 sm:px-10"><header><h2 className="font-serif text-3xl font-medium">设置</h2><p className="mt-3 text-muted-foreground">模型配置仅保存在当前浏览器。</p></header><ModelSettingsPanel loaded={loaded} onChange={onChange} value={value} /><div className="overflow-hidden rounded-xl border border-border bg-card">{localDataActions}</div></section>;
}

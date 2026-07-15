"use client";

/**
 * [INPUT]: Depends on browser localStorage, /api/chart, chart session validation, and model settings helpers
 * [OUTPUT]: Provides anonymous profile, current chart, model settings, and shared workspace actions
 * [POS]: Persistent client state boundary mounted above all workspace routes
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import type { CreateChartInput } from "@/lib/domain/chart";
import type { ChartDisplayModel } from "@/lib/domain/chart-display";
import {
  chartDisplayModelFromStorage,
  chartSessionFromStorage,
  chartSessionStorageKey,
  chartSessionStorageValue,
  isChartDisplayModel,
} from "@/lib/ui/chart-session";
import {
  defaultModelSettingsDraft,
  modelSettingsDraftFromStorage,
  modelSettingsStorageKey,
  modelSettingsStorageValue,
  type ModelSettingsDraft,
} from "@/lib/ui/model-settings";

type ChartApiPayload = {
  chart?: CreateChartInput;
  chartId: string;
  displayName: string;
  display: ChartDisplayModel;
};

type WorkspaceContextValue = {
  ready: boolean;
  profileId: string;
  conversationId: string;
  chartInput: CreateChartInput | null;
  chartDisplay: ChartDisplayModel | null;
  chartLoading: boolean;
  chartSynced: boolean;
  chartError: string | null;
  saveChart: (chart: CreateChartInput) => Promise<boolean>;
  resetLocalChart: () => void;
  modelSettings: ModelSettingsDraft;
  modelSettingsLoaded: boolean;
  setModelSettings: React.Dispatch<React.SetStateAction<ModelSettingsDraft>>;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profileId, setProfileId] = useState("");
  const [conversationId, setConversationId] = useState("");
  const [chartInput, setChartInput] = useState<CreateChartInput | null>(null);
  const [chartDisplay, setChartDisplay] = useState<ChartDisplayModel | null>(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartSynced, setChartSynced] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);
  const [modelSettings, setModelSettings] = useState<ModelSettingsDraft>(defaultModelSettingsDraft);
  const [modelSettingsLoaded, setModelSettingsLoaded] = useState(false);

  useEffect(() => {
    const bootstrapTimer = window.setTimeout(() => {
      const storedProfileId = window.localStorage.getItem("ziwei-chat-profile-id");
      const nextProfileId = isUuid(storedProfileId) ? storedProfileId : crypto.randomUUID();
      window.localStorage.setItem("ziwei-chat-profile-id", nextProfileId);
      setProfileId(nextProfileId);
      setConversationId(crypto.randomUUID());
      setModelSettings(modelSettingsDraftFromStorage(window.localStorage.getItem(modelSettingsStorageKey)));
      setModelSettingsLoaded(true);
      setReady(true);
    }, 0);

    return () => window.clearTimeout(bootstrapTimer);
  }, []);

  useEffect(() => {
    if (!modelSettingsLoaded) return;
    window.localStorage.setItem(modelSettingsStorageKey, modelSettingsStorageValue(modelSettings));
  }, [modelSettings, modelSettingsLoaded]);

  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    const restoreTimer = window.setTimeout(() => {
      const storageKey = chartSessionStorageKey(profileId);
      const storedValue = window.localStorage.getItem(storageKey);
      const storedChart = chartSessionFromStorage(storedValue, profileId);
      const storedDisplay = chartDisplayModelFromStorage(storedValue, profileId);

      if (storedChart) setChartInput(storedChart);
      if (storedChart && storedDisplay) {
        setChartDisplay(storedDisplay);
        setChartSynced(true);
        return;
      }

      setChartLoading(true);
      void fetch(`/api/chart?profileId=${encodeURIComponent(profileId)}`)
        .then(async (response) => {
          if (response.status === 404) return null;
          if (!response.ok) throw new Error("命盘恢复暂时不可用，请稍后重试。");
          return (await response.json()) as ChartApiPayload;
        })
        .then((payload) => {
          if (cancelled || !payload || !payload.chart || !isChartDisplayModel(payload.display)) return;
          const primaryChart = { ...payload.chart, profileId, isPrimary: true };
          setChartInput(primaryChart);
          setChartDisplay(payload.display);
          setChartSynced(true);
          window.localStorage.setItem(
            storageKey,
            chartSessionStorageValue(primaryChart, null, payload.display),
          );
        })
        .catch((error: unknown) => {
          if (!cancelled) setChartError(error instanceof Error ? error.message : "命盘恢复失败。");
        })
        .finally(() => {
          if (!cancelled) setChartLoading(false);
        });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(restoreTimer);
    };
  }, [profileId]);

  const saveChart = useCallback(async (nextChart: CreateChartInput) => {
    setChartLoading(true);
    setChartError(null);
    try {
      const response = await fetch("/api/chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, chart: nextChart }),
      });
      if (!response.ok) throw new Error("命盘保存失败，请检查出生信息后重试。");
      const payload = (await response.json()) as ChartApiPayload;
      if (!isChartDisplayModel(payload.display)) throw new Error("命盘展示数据不完整，请重试。");
      const primaryChart = { ...nextChart, profileId, isPrimary: true };
      setChartInput(primaryChart);
      setChartDisplay(payload.display);
      setChartSynced(true);
      window.localStorage.setItem(
        chartSessionStorageKey(profileId),
        chartSessionStorageValue(primaryChart, null, payload.display),
      );
      return true;
    } catch (error) {
      setChartError(error instanceof Error ? error.message : "命盘保存失败。");
      setChartSynced(false);
      return false;
    } finally {
      setChartLoading(false);
    }
  }, [profileId]);

  const resetLocalChart = useCallback(() => {
    if (!profileId) return;
    window.localStorage.removeItem(chartSessionStorageKey(profileId));
    setChartInput(null);
    setChartDisplay(null);
    setChartSynced(false);
    setChartError(null);
  }, [profileId]);

  const value = useMemo<WorkspaceContextValue>(() => ({
    ready,
    profileId,
    conversationId,
    chartInput,
    chartDisplay,
    chartLoading,
    chartSynced,
    chartError,
    saveChart,
    resetLocalChart,
    modelSettings,
    modelSettingsLoaded,
    setModelSettings,
  }), [
    ready,
    profileId,
    conversationId,
    chartInput,
    chartDisplay,
    chartLoading,
    chartSynced,
    chartError,
    saveChart,
    resetLocalChart,
    modelSettings,
    modelSettingsLoaded,
  ]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return value;
}

function isUuid(value: string | null): value is string {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

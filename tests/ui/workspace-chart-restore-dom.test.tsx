// @vitest-environment jsdom

import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { WorkspaceProvider, useWorkspace } from "../../src/components/workspace/workspace-provider";

const profileId = "00000000-0000-4000-8000-000000000001";

function Probe() {
  const workspace = useWorkspace();
  return (
    <div>
      <span data-testid="state">
        {workspace.chartLoading ? "loading" : workspace.chartError ?? workspace.chartDisplay?.chartId ?? (workspace.chartRestoreSettled ? "empty" : "pending")}
      </span>
      <span data-testid="profile">{workspace.profileId}</span>
      <button type="button" onClick={workspace.retryChartRestore}>retry</button>
      <button type="button" onClick={() => void workspace.deleteAnonymousData()}>delete</button>
    </div>
  );
}

beforeEach(() => {
  window.localStorage.clear();
  window.localStorage.setItem("ziwei-chat-profile-id", profileId);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("WorkspaceProvider chart restore lifecycle", () => {
  test("does not treat a null 2xx body as an empty chart", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(null)));

    render(<WorkspaceProvider><Probe /></WorkspaceProvider>);

    expect(await screen.findByText("命盘恢复响应格式无效，请重试。")).toBeTruthy();
    expect(screen.getByTestId("state").textContent).not.toBe("empty");
  });

  test("treats malformed 2xx as an error and retries into a real chart", async () => {
    let calls = 0;
    vi.stubGlobal("fetch", vi.fn(async () => {
      calls += 1;
      if (calls === 1) return Response.json({ chartId: "broken" });
      return Response.json(validPayload());
    }));

    render(<WorkspaceProvider><Probe /></WorkspaceProvider>);

    expect(await screen.findByText("命盘恢复响应格式无效，请重试。")).toBeTruthy();
    await act(async () => screen.getByRole("button", { name: "retry" }).click());

    await waitFor(() => expect(screen.getByTestId("state").textContent).toBe("chart-1"));
    expect(calls).toBe(2);
  });

  test("ignores a deferred restore after unmount", async () => {
    let resolveRestore!: (response: Response) => void;
    const restore = new Promise<Response>((resolve) => { resolveRestore = resolve; });
    vi.stubGlobal("fetch", vi.fn(() => restore));
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const view = render(<WorkspaceProvider><Probe /></WorkspaceProvider>);

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    view.unmount();
    resolveRestore(Response.json(validPayload()));
    await act(async () => { await restore; });

    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });

  test("does not let an old-profile restore write back after anonymous deletion", async () => {
    let resolveOldRestore!: (response: Response) => void;
    const oldRestore = new Promise<Response>((resolve) => { resolveOldRestore = resolve; });
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === "DELETE") return Promise.resolve(new Response(null, { status: 204 }));
      if (url.includes(profileId)) return oldRestore;
      return Promise.resolve(Response.json({ error: "not found" }, { status: 404 }));
    }));

    render(<WorkspaceProvider><Probe /></WorkspaceProvider>);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    await act(async () => screen.getByRole("button", { name: "delete" }).click());
    await waitFor(() => expect(screen.getByTestId("profile").textContent).not.toBe(profileId));
    await waitFor(() => expect(screen.getByTestId("state").textContent).toBe("empty"));

    resolveOldRestore(Response.json(validPayload()));
    await act(async () => { await oldRestore; });

    expect(screen.getByTestId("state").textContent).toBe("empty");
    expect(window.localStorage.getItem(`ziwei-chat-primary-chart:${profileId}`)).toBeNull();
  });
});

function validPayload() {
  return {
    chartId: "chart-1",
    displayName: "我的命盘",
    chart: {
      profileId,
      name: "我的命盘",
      gender: "male",
      birthDate: "1990-05-17",
      birthTime: "12:00",
      calendarType: "solar",
      isPrimary: true,
    },
    display: {
      chartId: "chart-1",
      displayName: "我的命盘",
      palaces: Array.from({ length: 12 }, (_, index) => ({
        id: `palace-${index}`,
        index,
        name: `宫位${index}`,
        heavenlyStem: "甲",
        earthlyBranch: "子",
        majorStars: [],
        minorStars: [],
        adjectiveStars: [],
        isBodyPalace: index === 0,
        isLaiyinPalace: index === 1,
      })),
    },
  };
}

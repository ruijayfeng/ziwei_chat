/**
 * [INPUT]: Depends on an anonymous profile id, profile revision, and chart operation revision
 * [OUTPUT]: Provides unified chart operation tokens and a pure current-token guard
 * [POS]: Shared UI concurrency boundary for operations that must not cross profile changes
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

export type ProfileOperationToken = {
  profileId: string;
  profileRevision: number;
  chartOperationRevision: number;
};

export function isCurrentProfileOperation(
  token: ProfileOperationToken,
  current: ProfileOperationToken,
): boolean {
  return Boolean(token.profileId)
    && token.profileId === current.profileId
    && token.profileRevision === current.profileRevision
    && token.chartOperationRevision === current.chartOperationRevision;
}

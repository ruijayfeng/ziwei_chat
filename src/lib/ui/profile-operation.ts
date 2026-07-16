/**
 * [INPUT]: Depends on an anonymous profile id and its monotonically increasing operation revision
 * [OUTPUT]: Provides profile-scoped async operation tokens and a pure current-token guard
 * [POS]: Shared UI concurrency boundary for operations that must not cross profile changes
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

export type ProfileOperationToken = {
  profileId: string;
  revision: number;
};

export function isCurrentProfileOperation(
  token: ProfileOperationToken,
  current: ProfileOperationToken,
): boolean {
  return Boolean(token.profileId) && token.profileId === current.profileId && token.revision === current.revision;
}

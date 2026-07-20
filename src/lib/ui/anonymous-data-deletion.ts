/**
 * [INPUT]: Depends on a remote deletion operation and caller-owned local cleanup
 * [OUTPUT]: Provides remote-first anonymous-data deletion coordination
 * [POS]: Pure lifecycle boundary that prevents local success effects before server deletion commits
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

export async function deleteAnonymousProfileData(
  requestDeletion: () => Promise<void>,
  cleanupLocalData: () => void,
) {
  await requestDeletion();
  cleanupLocalData();
}

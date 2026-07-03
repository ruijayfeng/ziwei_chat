/**
 * [INPUT]: Depends on ZiweiChatShell client component
 * [OUTPUT]: Provides the Ziwei Chat MVP application entry page
 * [POS]: App Router page that renders the usable chat-first product surface
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import { ZiweiChatShell } from "@/components/ziwei-chat-shell";

export default function Home() {
  return <ZiweiChatShell />;
}

import { WorkspaceProvider } from "@/components/workspace/workspace-provider";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <WorkspaceProvider>{children}</WorkspaceProvider>;
}

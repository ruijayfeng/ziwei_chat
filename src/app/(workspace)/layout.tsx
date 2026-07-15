import { WorkspaceAppLayout } from "@/components/workspace/app-layout";
import { WorkspaceMotionProvider } from "@/components/workspace/motion-provider";
import { WorkspaceProvider } from "@/components/workspace/workspace-provider";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceMotionProvider>
      <WorkspaceProvider>
        <WorkspaceAppLayout>{children}</WorkspaceAppLayout>
      </WorkspaceProvider>
    </WorkspaceMotionProvider>
  );
}

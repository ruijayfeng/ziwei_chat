import { WorkspaceAppLayout } from "@/components/workspace/app-layout";
import { WorkspaceMotionProvider } from "@/components/workspace/motion-provider";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceMotionProvider>
      <WorkspaceAppLayout>{children}</WorkspaceAppLayout>
    </WorkspaceMotionProvider>
  );
}

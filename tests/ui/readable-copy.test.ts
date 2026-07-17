import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

const projectRoot = process.cwd();

const userVisibleCopyFiles = [
  "src/components/chart-onboarding.tsx",
  "src/components/chat/chat-composer.tsx",
  "src/components/chat/chat-experience.tsx",
  "src/components/chat/evidence-inspector.tsx",
  "src/app/(workspace)/chart/page.tsx",
  "src/components/chart/chart-hero.tsx",
  "src/components/chart/palace-inspector.tsx",
  "src/components/model-settings-panel.tsx",
  "src/components/workspace/workspace-provider.tsx",
  "src/lib/agent/model-provider.ts",
  "src/lib/ui/chart-profile.ts",
  "src/lib/ui/chat-errors.ts",
  "src/lib/ui/chat-evidence.ts",
  "src/lib/ui/model-settings.ts",
  "tests/ui/chart-profile.test.ts",
  "tests/ui/chat-errors.test.ts",
  "tests/ui/chat-evidence.test.ts",
];

const mojibakeMarkers = /[锟�]|[鐢濂鍛鍙绱闃鍐娓渚璇妫]|銆|€|琛ㄨ揪|瀹樼|杩|褰撳墠|淇濆瓨|閲嶈瘯/;

describe("user-visible Chinese copy", () => {
  test.each(userVisibleCopyFiles)("%s does not contain common mojibake markers", (file) => {
    const source = readFileSync(join(projectRoot, file), "utf8");

    expect(source).not.toMatch(mojibakeMarkers);
  });
});

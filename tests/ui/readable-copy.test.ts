import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

const projectRoot = process.cwd();

const userVisibleCopyFiles = ["src/app", "src/components", "src/lib"]
  .flatMap((directory) =>
    readdirSync(join(projectRoot, directory), { recursive: true, withFileTypes: true })
      .filter(
        (entry) => entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")),
      )
      .map((entry) =>
        join(entry.parentPath, entry.name).slice(projectRoot.length + 1).replaceAll("\\", "/"),
      ),
  );

const runtimeKnowledgeFiles = readdirSync(join(projectRoot, "content", "knowledge"), {
  recursive: true,
  withFileTypes: true,
})
  .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
  .map((entry) =>
    join(entry.parentPath, entry.name).slice(projectRoot.length + 1).replaceAll("\\", "/"),
  );

const mojibakeMarkers = /[锟�]|[鐢濂鍛鍙绱闃鍐娓渚璇妫]|銆|€|琛ㄨ揪|瀹樼|杩|褰撳墠|淇濆瓨|閲嶈瘯/;
const historicalImporterLiterals = [
  "绱井",
  "鏂楁暟",
  "鏄熸洔",
  "鍚涜嚕搴嗕細",
  "绱簻鍚屽",
  "搴滅浉鏈濆灒",
  "闃虫鏄岀",
  "鏉€鐮寸嫾",
  "鏈烘湀鍚屾",
  "瀹樼",
  "浜嬩笟",
  "鑱屼笟",
  "澶",
  "鎰熸儏",
  "璐㈠笡",
  "璐㈠瘜",
  "鍛藉",
  "韬",
  "鎬ф牸",
  "澶ч檺",
  "娴佸勾",
  "杩愰檺",
];

describe("user-visible Chinese copy", () => {
  test.each(userVisibleCopyFiles)("%s does not contain common mojibake markers", (file) => {
    let source = readFileSync(join(projectRoot, file), "utf8");

    expect(source).not.toContain("\uFFFD");
    if (file === "src/lib/knowledge/ziwei-doushu-importer.ts") {
      for (const literal of historicalImporterLiterals) {
        expect(source.split(literal)).toHaveLength(2);
        source = source.replace(literal, "");
      }
    }
    expect(source).not.toMatch(mojibakeMarkers);
  });

  test.each(runtimeKnowledgeFiles)("%s is valid readable UTF-8", (file) => {
    const source = readFileSync(join(projectRoot, file), "utf8");

    expect(source).not.toContain("\uFFFD");
    expect(source).not.toMatch(mojibakeMarkers);
  });
});

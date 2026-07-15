import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "紫微知道 · 可信的命盘分析助手",
  description: "从确定性命盘事实出发，提供可追溯的紫微斗数对话分析。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="min-h-full bg-background antialiased">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/lxgw-wenkai-webfont@1.7.0/lxgwwenkai-regular.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/lxgw-wenkai-webfont@1.7.0/lxgwwenkai-bold.css" />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}

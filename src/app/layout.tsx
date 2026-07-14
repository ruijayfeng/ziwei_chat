import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "紫微知道",
  description: "可信的命盘分析助手",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

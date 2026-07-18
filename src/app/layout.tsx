import type { Metadata } from "next";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./globals.css";
import QueryProvider from "@/providers/QueryProvider";
import BootstrapClient from "@/components/layout/BootstrapClient";

export const metadata: Metadata = {
  title: "出差行程规划助手",
  description: "智能出差行程规划、比价、攻略导入",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <QueryProvider>
          <BootstrapClient />
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}

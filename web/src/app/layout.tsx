import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "패션 고객 대시보드",
  description: "이랜드 리테일 패션 고객 지표 대시보드",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="h-full">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body
        className="min-h-full bg-gray-50 text-gray-900 antialiased"
        style={{ fontFamily: "'Pretendard', -apple-system, sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}

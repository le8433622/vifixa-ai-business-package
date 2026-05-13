import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import QueryProvider from "@/components/QueryProvider";
import { ToastProvider } from "@/components/Toast";
import { FeatureFlagProvider } from "@/components/FeatureFlagProvider";
import ErrorBoundary from "@/components/ErrorBoundary";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vifixa AI — Sửa chữa nhà thông minh #1 Việt Nam",
  description: "Chẩn đoán AI tức thì, báo giá minh bạch, thợ chuyên nghiệp được xác minh. Đặt dịch vụ sửa chữa nhà chỉ trong 60 giây.",
  keywords: ["sửa chữa nhà", "AI", "thợ sửa chữa", "Vifixa", "dịch vụ nhà", "Việt Nam"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${inter.variable} ${plusJakarta.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <ErrorBoundary>
          <QueryProvider>
            <ToastProvider>
              <FeatureFlagProvider>
                {children}
              </FeatureFlagProvider>
            </ToastProvider>
          </QueryProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}

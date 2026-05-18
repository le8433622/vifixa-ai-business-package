import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import QueryProvider from "@/components/QueryProvider";
import { ToastProvider } from "@/components/Toast";
import { FeatureFlagProvider } from "@/components/FeatureFlagProvider";
import { ThemeProvider } from "@/components/common/ThemeProvider";
import { CurrencyProvider } from "@/components/common/CurrencyProvider";
import ErrorBoundary from "@/components/ErrorBoundary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vifixa AI - AI-Powered Home Services",
  description: "Get instant AI diagnosis, transparent pricing, and trusted professionals for all your home service needs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <CurrencyProvider>
            <QueryProvider>
              <ToastProvider>
                <FeatureFlagProvider>
                  <ErrorBoundary>
                    {children}
                  </ErrorBoundary>
                </FeatureFlagProvider>
              </ToastProvider>
            </QueryProvider>
          </CurrencyProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter, Lexend } from "next/font/google";
import { Toaster } from "sonner";
import { QueryProvider } from "@/providers/query-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { APP_FULL_NAME, APP_NAME, INSTITUTION } from "@/constants/app";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: `${APP_NAME} | Paperless Academic Defense Workflow System — ${INSTITUTION}`,
  description: `${APP_FULL_NAME} at ${INSTITUTION}.`,
  keywords: [
    "AURORA",
    "academic defense",
    "thesis defense",
    "capstone defense",
    "dissertation defense",
    "research papers",
    "Partido State University",
    "ParSU",
    "paperless workflow",
  ],
  openGraph: {
    title: `${APP_NAME} — Paperless Academic Defense Workflow System | ${INSTITUTION}`,
    description: `${APP_FULL_NAME} at ${INSTITUTION}.`,
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${lexend.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <QueryProvider>
            <AuthProvider>
              {children}
              <Toaster position="top-right" richColors closeButton />
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

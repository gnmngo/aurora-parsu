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
  title: `${APP_NAME} | ${INSTITUTION}`,
  description: `${APP_FULL_NAME} — A paperless academic defense workflow platform for ${INSTITUTION}.`,
  keywords: ["AURORA", "academic defense", "thesis", "capstone", "Partido State University", "paperless"],
  openGraph: {
    title: `${APP_NAME} — ${INSTITUTION}`,
    description: APP_FULL_NAME,
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

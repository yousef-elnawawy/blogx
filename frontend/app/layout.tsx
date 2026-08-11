import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import SplashScreen from "@/components/SplashScreen";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BlogX",
  description: "BlogX",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={inter.className}
      suppressHydrationWarning
    >
      <body className="bg-background text-foreground min-h-screen antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <NotificationProvider>
              <SplashScreen />
              {children}
              <Toaster position="top-right" richColors />
            </NotificationProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
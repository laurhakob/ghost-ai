import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/ui/themes";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ghost AI",
  description: "ghost AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ClerkProvider
          appearance={{
            theme: dark,
            variables: {
              colorPrimary: "var(--primary)",
              colorPrimaryForeground: "var(--primary-foreground)",
              colorBackground: "var(--card)",
              colorForeground: "var(--card-foreground)",
              colorMuted: "var(--muted)",
              colorMutedForeground: "var(--muted-foreground)",
              colorNeutral: "var(--foreground)",
              colorInput: "var(--input)",
              colorInputForeground: "var(--card-foreground)",
              colorDanger: "var(--destructive)",
              colorRing: "var(--ring)",
              borderRadius: "var(--radius)",
            },
          }}
        >
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
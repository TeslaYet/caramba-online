import type { Metadata } from "next";
import { Fredoka, Nunito } from "next/font/google";
import { PreferencesProvider } from "@/components/providers/preferences-provider";
import "./globals.css";

const display = Fredoka({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const sans = Nunito({
  variable: "--font-source-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Carramba Online",
  description: "A private multiplayer card game. Keep your hand low. Call Carramba.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">
        <PreferencesProvider>{children}</PreferencesProvider>
      </body>
    </html>
  );
}

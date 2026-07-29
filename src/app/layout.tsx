import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Lexend } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VereinDigital | Trainer Dashboard",
  description:
    "SaaS-Plattform fuer Fussballvereine mit Kader, Kalender und Spieltagsstatistiken.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className={`${lexend.variable} h-full antialiased`} lang="de" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              '(function(){try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t);}}catch(e){}})();',
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ClerkProvider>{children}</ClerkProvider>
        <Analytics />
      </body>
    </html>
  );
}

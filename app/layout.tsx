import type { Metadata } from "next";
import Script from "next/script";

import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

export const metadata: Metadata = {
  title: "Maket Lakay",
  description: "A modern marketplace foundation for Haiti and the Haitian diaspora.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script
          id="strip-extension-hydration-attrs"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (() => {
                const extensionAttributes = ["cz-shortcut-listen"];
                const strip = () => {
                  if (!document.body) return;
                  for (const attribute of extensionAttributes) {
                    if (document.body.hasAttribute(attribute)) {
                      document.body.removeAttribute(attribute);
                    }
                  }
                };

                strip();
                const observer = new MutationObserver(strip);
                observer.observe(document.documentElement, {
                  attributes: true,
                  childList: true,
                  subtree: true,
                });
                window.addEventListener("DOMContentLoaded", strip, { once: true });
                window.addEventListener("load", () => {
                  strip();
                  window.setTimeout(() => observer.disconnect(), 3000);
                }, { once: true });
              })();
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        {children}
        <Toaster />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "./I18nProvider";

export const metadata: Metadata = {
  title: "Lucky Pet Tag - App",
  description: "Secure and Smart Pet Identification System",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

        <style>
          {`
            body {
              visibility: hidden;
              opacity: 0;
              transition: visibility 0s 0.2s, opacity 0.2s linear;
              font-family: 'Inter', sans-serif;
            }
          `}
        </style>
      </head>
      <body suppressHydrationWarning={true}>

        <I18nProvider>
          {children}
        </I18nProvider>

        {/* Tu script original restaurado */}
        <script>
          {`
            window.addEventListener('DOMContentLoaded', function() {
              document.body.style.visibility = 'visible';
              document.body.style.opacity = '1';
            });
          `}
        </script>
      </body>
    </html>
  );
}
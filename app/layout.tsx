import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lucky Pet Tag - App",
  description: "Secure and Smart Pet Identification System",
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
      {/* 1. Añadimos clases al body para manejar el flujo vertical */}
      <body suppressHydrationWarning={true} className="flex flex-col min-h-screen">

        {/* 2. Nueva cabecera pequeña para el traductor */}
        <header className="w-full bg-white/80 backdrop-blur-md border-b border-[#bec9c0]/10 py-1.5 px-6 flex justify-end items-center sticky top-0 z-[100]">
          <div id="google_translate_element" className="scale-90 origin-right"></div>
        </header>
        
        {/* 3. El contenido principal ahora fluye debajo del header */}
        <main className="flex-grow">
          {children}
        </main>

        {/* Scripts de inicialización y carga de Google Translate */}
        <Script
          id="google-translate-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              function googleTranslateElementInit() {
                new window.google.translate.TranslateElement({
                  pageLanguage: 'en',
                  includedLanguages: 'es,fr,de',
                  autoDisplay: false
                }, 'google_translate_element');
              }
            `,
          }}
        />
        <Script
          id="google-translate-script"
          src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
          strategy="afterInteractive"
        />

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
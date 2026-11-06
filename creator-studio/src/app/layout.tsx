import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

// Black-screen insurance: hydration se PEHLE hi har JS error ko screen par dikha do.
// Pehle phone par JS fail hone par sirf kaali screen dikhti thi — ab error ka text
// ek laal banner me visible hoga (StudioScreen Kotlin side bhi console capture karta hai).
const ERROR_NET = `
(function () {
  function show(msg) {
    try {
      var root = document.getElementById('cs-error-net');
      if (!root) {
        root = document.createElement('div');
        root.id = 'cs-error-net';
        root.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:2147483647;' +
          'background:#7f1d1d;color:#fff;font:11px/1.45 ui-monospace,monospace;' +
          'padding:10px 12px;max-height:40%;overflow:auto;white-space:pre-wrap;word-break:break-all';
        document.body.appendChild(root);
      }
      root.textContent = ('Studio JS error: ' + msg + '\\n(retry ke liye upar wala refresh button dabao)').slice(0, 900);
    } catch (e) { /* ignore */ }
  }
  window.addEventListener('error', function (e) {
    show((e.message || 'script error') + (e.filename ? ' @ ' + e.filename.split('/').pop() + ':' + e.lineno : ''));
  });
  window.addEventListener('unhandledrejection', function (e) {
    var r = e.reason; show('promise: ' + ((r && r.message) || r));
  });
})();
`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Creator Studio — Main Brain",
  description: "YouTube Automation Creator Studio — agent skills, packages aur self-learning brain ka management. Phone-first app.",
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  // app-like behaviour when saved to home screen
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Creator Studio",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0F0F0F",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Script id="cs-error-net" strategy="beforeInteractive">
          {ERROR_NET}
        </Script>
        {children}
        <Toaster theme="dark" position="top-center" richColors />
      </body>
    </html>
  );
}

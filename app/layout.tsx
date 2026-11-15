import type { Metadata } from "next";
import localFont from "next/font/local";
import { Header } from "@/components/layout/header";
import { AuthProvider } from "@/components/auth/provider";
import { Footer } from "@/components/layout/footer";
import "./globals.css";
import "./home.css";

const firaSans = localFont({
  src: [
    { path: "./fonts/fira-sans-400.woff2", weight: "400" },
    { path: "./fonts/fira-sans-500.woff2", weight: "500" },
    { path: "./fonts/fira-sans-600.woff2", weight: "600" },
    { path: "./fonts/fira-sans-700.woff2", weight: "700" },
  ],
  variable: "--font-fira-sans",
  display: "swap",
});
export const metadata: Metadata = {
  title: {
    default: "Veltrix Rentals | Find your perfect drive",
    template: "%s | Veltrix Rentals",
  },
  description:
    "Explore city cars, spacious SUVs and memorable weekend drives with Veltrix Rentals. Car rental portfolio application in development.",
  icons: { icon: "/brand/veltrix-mark.svg" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={firaSans.variable}>
      <body>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <AuthProvider>
          <Header
            googleEnabled={Boolean(
              process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
            )}
          />
          {children}
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}

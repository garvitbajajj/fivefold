import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
});
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});
export const metadata = {
  title: {
    default: "fivefold — your last five rounds could change everything",
    template: "%s · fivefold",
  },
  description:
    "A subscription that turns your last five golf scores into a monthly prize draw, and sends a share of every payment to a cause you pick.",
};
export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

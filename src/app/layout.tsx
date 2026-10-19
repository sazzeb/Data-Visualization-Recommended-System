
import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";
import "@/styles/main.scss";

export const metadata: Metadata = {
  title: "TravelWise | Discover Your Next Journey",
  description:
    "Explore destinations, compare travel budgets, and plan memorable experiences with visual insights.",
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({
  children,
}: Readonly<RootLayoutProps>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

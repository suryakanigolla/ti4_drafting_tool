import "./globals.css";
import { ReactNode } from "react";

export const metadata = {
  title: "TI4 Faction Draft",
  description: "Private room-based TI4 faction drafting"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

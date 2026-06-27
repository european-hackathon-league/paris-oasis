import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MSD Floor-Plan Challenge — Data Visualization",
  description:
    "Interactive visualization of the Modified Swiss Dwellings floor-plan generation challenge: dataset, representations, and evaluation pipeline.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

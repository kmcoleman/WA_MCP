import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BMW NorCal Ride Planner",
  description: "Configure monthly ride events for Wild Apricot",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 antialiased">
        {children}
      </body>
    </html>
  );
}

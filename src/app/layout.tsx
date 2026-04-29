import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "AirSight — Air Quality Intelligence",
  description:
    "Decision-support dashboard and conversational agent for PM2.5 and AQI monitoring across Nigeria and Ghana.",
  authors: [{ name: "AirSight" }],
  openGraph: {
    title: "AirSight — Air Quality Intelligence",
    description:
      "Decision-support dashboard and conversational agent for PM2.5 and AQI monitoring across Nigeria and Ghana.",
    type: "website",
  },
  twitter: {
    card: "summary",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

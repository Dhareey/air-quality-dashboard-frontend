import type { Metadata } from "next";
import { DashboardPage } from "./_DashboardPage";

export const metadata: Metadata = {
  title: "Dashboard — AirSight Air Quality Intelligence",
  description:
    "Decision-support dashboard for PM2.5 and AQI monitoring across Nigeria and Ghana.",
  openGraph: {
    title: "AirSight — Air Quality Dashboard",
    description:
      "Decision-support dashboard for PM2.5 and AQI monitoring across Nigeria and Ghana.",
  },
};

export default function Page() {
  return <DashboardPage />;
}

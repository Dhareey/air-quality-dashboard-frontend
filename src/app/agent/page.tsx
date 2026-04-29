import type { Metadata } from "next";
import { AgentPage } from "./_AgentPage";

export const metadata: Metadata = {
  title: "Agent — AirSight Air Quality Intelligence",
  description:
    "Conversational AI agent for exploring PM2.5 and AQI data across Nigeria and Ghana.",
  openGraph: {
    title: "AirSight Agent — Conversational Air Quality Intel",
    description:
      "Ask questions, surface insights, and explore PM2.5 trends with an interactive agent.",
  },
};

export default function Page() {
  return <AgentPage />;
}

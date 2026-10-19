import { HomeView } from "@/components/home/home-view";
import type { Metadata } from "next";
import { constructPageMetadata } from "@/lib/metadata";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  ...constructPageMetadata({
    title: "Chibueze Maxwell",
    description:
      "Chibueze Maxwell is a Super Intelligence engineer and entrepreneur building intelligent systems. Explore his work, research, and writing.",
    path: "/",
  }),
  title: { absolute: "Chibueze Maxwell | Super Intelligence Engineer & Entrepreneur" },
  verification: { google: "6oW8w0a8eNljvhIuI2bd51M-1GC4qctVVFECy5xtnq4" },
};

export default function Home() {
  return <HomeView />;
}

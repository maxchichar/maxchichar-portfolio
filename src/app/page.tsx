import { HomeView } from "@/components/home/home-view";
import type { Metadata } from "next";
import { constructPageMetadata } from "@/lib/metadata";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  ...constructPageMetadata({
    title: "Chibueze Maxwell (MAXCHICHAR) | AI Engineer, Research & Writing",
    description:
      "Chibueze Maxwell, also known as MAXCHICHAR, is an AI engineer and entrepreneur exploring technology, research, and ideas through projects and writing.",
    path: "/",
  }),
  title: { absolute: "Chibueze Maxwell (MAXCHICHAR) | AI Engineer, Research & Writing" },
  verification: { google: "6oW8w0a8eNljvhIuI2bd51M-1GC4qctVVFECy5xtnq4" },
};

export default function Home() {
  return <HomeView />;
}

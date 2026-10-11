import { HomeView } from "@/components/home/home-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function Home() {
  return <HomeView />;
}

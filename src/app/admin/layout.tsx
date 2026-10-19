// Admin is request-only on Vercel and redirected before Next on Cloudflare.
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

// Never prerender protected children, including when the Worker auth stub is used.
export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}

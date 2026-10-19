// Admin is request-only on Vercel and redirected before Next on Cloudflare.
// Never prerender protected children, including when the Worker auth stub is used.
export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}

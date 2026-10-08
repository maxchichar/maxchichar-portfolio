import { AdminPageHeader } from "@/components/admin/page-header";
import { listMediaLibrary } from "@/server/services/media";
import { getPublicSiteSettings } from "@/server/services/settings";

import { SettingsForm } from "./settings-form";

export default async function AdminSettingsPage() {
  const [settings, libraryMedia] = await Promise.all([
    getPublicSiteSettings(),
    listMediaLibrary({ status: "READY" }),
  ]);

  return (
    <main className="mx-auto max-w-4xl px-6 py-12 md:py-16">
      <AdminPageHeader
        title="Settings"
        description="Site branding, imagery, social profile links, and footer configuration."
      />

      <SettingsForm
        initialSettings={settings}
        libraryMedia={libraryMedia.map((m) => ({
          id: m.id,
          filename: m.filename,
          storageUrl: m.storageUrl,
          width: m.width,
          height: m.height,
        }))}
      />
    </main>
  );
}

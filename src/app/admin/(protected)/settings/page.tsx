import { AdminPageHeader } from "@/components/admin/page-header";
import { getSiteDocument, isSiteDocumentsAvailable } from "@/server/services/documents";
import { listMediaLibrary } from "@/server/services/media";
import { getPublicSiteSettings } from "@/server/services/settings";

import { CvSection } from "./cv-section";
import { SettingsForm } from "./settings-form";

export default async function AdminSettingsPage() {
  const [settings, libraryMedia, cv, avatar, documentsAvailable] = await Promise.all([
    getPublicSiteSettings(),
    listMediaLibrary({ status: "READY", kind: "image" }),
    getSiteDocument("cv"),
    getSiteDocument("avatar"),
    isSiteDocumentsAvailable().catch(() => true),
  ]);

  return (
    <main className="mx-auto max-w-4xl px-6 py-12 md:py-16">
      <AdminPageHeader
        title="Settings"
        description="Site branding, imagery, CV, social profile links, and footer configuration."
      />

      <SettingsForm
        initialSettings={settings}
        initialAvatar={avatar ? { mediaId: avatar.mediaId, url: avatar.url } : null}
        libraryMedia={libraryMedia.map((m) => ({
          id: m.id,
          filename: m.filename,
          storageUrl: m.storageUrl,
          width: m.width,
          height: m.height,
        }))}
      />

      <CvSection
        initial={
          cv
            ? {
                filename: cv.filename,
                sizeBytes: cv.sizeBytes,
                updatedAt: cv.updatedAt.toISOString(),
              }
            : null
        }
        disabledReason={
          documentsAvailable
            ? null
            : "The CV needs a one-time database update. Run `npm run db:push`, then reload this page."
        }
      />
    </main>
  );
}

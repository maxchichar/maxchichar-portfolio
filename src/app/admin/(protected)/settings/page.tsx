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
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 md:px-10 md:py-10">
      <AdminPageHeader
        title="Settings"
        description="Your name and tagline, site imagery, CV, social profiles and footer. Changes apply across the whole public site."
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
      >
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
      </SettingsForm>
    </main>
  );
}

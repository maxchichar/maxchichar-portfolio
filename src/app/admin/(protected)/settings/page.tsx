import { getPublicSiteSettings } from "@/server/services/settings";

import { SettingsForm } from "./settings-form";

export default async function AdminSettingsPage() {
  const settings = await getPublicSiteSettings();

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-8">
        <p className="text-accent-purple font-sans text-sm font-medium">Portfolio OS</p>
        <h1 className="text-text mt-2 font-sans text-2xl font-semibold">Settings</h1>
        <p className="text-text-muted mt-1 font-serif text-sm">
          Site branding, positioning statement, social profile links, and footer
          configuration.
        </p>
      </div>

      <SettingsForm initialSettings={settings} />
    </main>
  );
}

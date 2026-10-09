"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth/config";
import {
  setSiteImage,
  updateSiteSettings,
  type SiteImageField,
} from "@/server/services/settings";

export interface SettingsFormState {
  success: boolean;
  error?: string;
}

export async function saveSettingsForm(
  _prevState: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated." };
  }

  const raw = {
    siteName: formData.get("siteName"),
    siteDescription: formData.get("siteDescription"),
    primaryEmail: formData.get("primaryEmail"),
    socialGithub: formData.get("socialGithub"),
    socialX: formData.get("socialX"),
    socialLinkedin: formData.get("socialLinkedin"),
    socialYoutube: formData.get("socialYoutube"),
    socialInstagram: formData.get("socialInstagram"),
    socialTiktok: formData.get("socialTiktok"),
    footerText: formData.get("footerText"),
    heroMediaId: formData.get("heroMediaId"),
    aboutMediaId: formData.get("aboutMediaId"),
  };

  const result = await updateSiteSettings(raw, {
    id: session.user.id,
    type: "HUMAN",
  });

  if (result.success) {
    revalidatePath("/", "layout");
    revalidatePath("/admin/settings");
    return { success: true };
  }

  return { success: false, error: result.error };
}

/** Saves a single site image (hero / about) immediately and refreshes the site. */
export async function saveSiteImage(
  field: SiteImageField,
  mediaId: string | null,
): Promise<SettingsFormState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated." };
  }
  if (field !== "heroMediaId" && field !== "aboutMediaId") {
    return { success: false, error: "Unknown image field." };
  }
  const result = await setSiteImage(field, mediaId, {
    id: session.user.id,
    type: "HUMAN",
  });
  if (result.success) {
    revalidatePath("/", "layout");
  }
  return result;
}

import { hasRichContent } from "@/lib/rich-text";
import {
  parseRichTextField,
  PROJECT_SECTION_KEYS,
  projectDraftUpdateSchema,
} from "./project";

/** Read the complete editor form before saving, previewing or publishing. */
export function parseProjectDraftForm(formData: FormData) {
  const sections = PROJECT_SECTION_KEYS.map((key) => {
    const content = parseRichTextField(formData.get(`section_${key}`));
    if (!hasRichContent(content)) return null;
    return {
      key,
      heading: String(formData.get(`heading_${key}`) ?? key),
      content,
    };
  }).filter((s): s is NonNullable<typeof s> => s !== null);

  const technologies = String(formData.get("technologies") ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const tags = String(formData.get("tags") ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  // Tri-state: field absent -> undefined (don't touch existing cover);
  // present but empty -> null (explicit clear); present with a value ->
  // that value (set/keep, verified server-side in the service layer).
  const coverMediaIdRaw = formData.get("coverMediaId");
  const coverMediaId =
    coverMediaIdRaw === null
      ? undefined
      : coverMediaIdRaw === ""
        ? null
        : String(coverMediaIdRaw);

  const parsed = projectDraftUpdateSchema.safeParse({
    title: formData.get("title"),
    shortDescription: formData.get("shortDescription"),
    category: formData.get("category") || null,
    year: formData.get("year") ? Number(formData.get("year")) : null,
    technologies,
    githubUrl: formData.get("githubUrl") || null,
    liveUrl: formData.get("liveUrl") || null,
    documentationUrl: formData.get("documentationUrl") || null,
    sections,
    tags,
    coverMediaId,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  return parsed.data;
}

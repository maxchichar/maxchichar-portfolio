"use server";

import { headers } from "next/headers";

import { submitContact } from "@/server/services/contact";

export interface ContactFormState {
  success: boolean;
  error?: string;
}

export async function submitContactForm(
  stateOrFormData: ContactFormState | FormData,
  maybeFormData?: FormData,
): Promise<ContactFormState> {
  const formData =
    maybeFormData instanceof FormData
      ? maybeFormData
      : stateOrFormData instanceof FormData
        ? stateOrFormData
        : new FormData();

  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  const realIp = headerList.get("x-real-ip");
  const clientIp = forwarded?.split(",")[0]?.trim() || realIp || "127.0.0.1";

  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    organization: formData.get("organization"),
    reason: formData.get("reason"),
    message: formData.get("message"),
    honeypot: formData.get("honeypot"),
  };

  return submitContact(raw, clientIp);
}

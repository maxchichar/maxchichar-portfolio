"use client";

import { useEffect } from "react";

import { reportClientError } from "@/lib/report-client-error";

/**
 * Reports uncaught browser errors that happen outside React's error
 * boundaries (e.g. in an event handler). Only errors from our own scripts:
 * browser extensions and third-party code are ignored.
 */
export function ErrorListener() {
  useEffect(() => {
    const ours = (file: string | undefined) =>
      Boolean(file && file.startsWith(window.location.origin));
    const onError = (e: ErrorEvent) => {
      if (ours(e.filename)) reportClientError(e.error ?? e.message);
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const stack = (e.reason as { stack?: unknown })?.stack;
      if (typeof stack === "string" && stack.includes(window.location.origin)) {
        reportClientError(e.reason);
      }
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}

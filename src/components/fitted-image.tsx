import type { ImageProps } from "next/image";

import { MediaImage } from "@/components/media-image";

/**
 * A cover image shown whole: scaled to fit its frame and centred, never
 * cropped. Whatever room the picture leaves in the frame is filled with a
 * soft, blurred copy of the same image (same URL and sizes, so no extra
 * download) instead of flat bars. Hover zoom, if any, goes on the backdrop
 * so the picture itself is never cut off.
 *
 * The parent must be `relative` with a size (it fills it, like `fill`).
 */
export function FittedImage({
  src,
  alt,
  sizes,
  className,
  backdropClassName,
  ...props
}: Omit<ImageProps, "fill" | "src"> & {
  src: string;
  /** Extra classes for the foreground image. */
  className?: string;
  /** Extra classes for the blurred backdrop (e.g. a hover zoom). */
  backdropClassName?: string;
}) {
  return (
    <>
      <MediaImage
        src={src}
        alt=""
        aria-hidden="true"
        fill
        sizes={sizes}
        loading={props.loading}
        className={`scale-110 object-cover opacity-50 blur-2xl saturate-150 ${backdropClassName ?? ""}`}
      />
      <MediaImage
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        {...props}
        className={`object-contain object-center ${className ?? ""}`}
      />
    </>
  );
}

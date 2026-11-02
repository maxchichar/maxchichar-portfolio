import { getImageProps, type ImageProps } from "next/image";

import { MediaImage } from "@/components/media-image";
import { isOptimizableImage } from "@/lib/storage/image";

/** The backdrop is blurred, so a small variant is plenty (one of `imageSizes`). */
const BACKDROP_WIDTH = 384;

/**
 * A cover image shown whole: scaled to fit its frame and centred, never
 * cropped. Whatever room the picture leaves in the frame is filled with a
 * soft, blurred copy of the same image instead of flat bars. The copy is a
 * CSS background from a small variant, so the frame still holds exactly one
 * <img> and the extra download is tiny. Hover zoom, if any, goes on the
 * backdrop so the picture itself is never cut off.
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
  const unoptimized = props.unoptimized ?? !isOptimizableImage(src);
  const backdropSrc = getImageProps({
    src,
    alt: "",
    width: BACKDROP_WIDTH,
    height: BACKDROP_WIDTH,
    unoptimized,
  }).props.src;

  return (
    <>
      <div
        aria-hidden="true"
        className={`absolute inset-0 scale-110 bg-cover bg-center opacity-50 blur-2xl saturate-150 ${backdropClassName ?? ""}`}
        style={{ backgroundImage: `url(${JSON.stringify(backdropSrc)})` }}
      />
      <MediaImage
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        unoptimized={unoptimized}
        {...props}
        className={`object-contain object-center ${className ?? ""}`}
      />
    </>
  );
}

import Image, { type ImageProps } from "next/image";

import { isOptimizableImage } from "@/lib/storage/image";

/**
 * next/image for uploaded media: our R2 uploads are optimized (responsive
 * srcset, WebP), any other URL is rendered unchanged. Server components only,
 * since the storage origin is read from server env.
 */
export function MediaImage({
  src,
  alt,
  unoptimized,
  ...props
}: ImageProps & { src: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      unoptimized={unoptimized ?? !isOptimizableImage(src)}
      {...props}
    />
  );
}

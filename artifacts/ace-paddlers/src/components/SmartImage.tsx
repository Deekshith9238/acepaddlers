import { useEffect, useRef, useState } from "react";

type SmartImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  /**
   * Classes applied to the positioning wrapper (sizing, aspect ratio, rounding, etc.).
   * Should include a positioning class (`relative` or `absolute`) so the shimmer
   * overlay anchors correctly — `relative` is added automatically when absent.
   */
  wrapperClassName?: string;
  /** Classes applied to the <img> itself. */
  className?: string;
};

const hasPosition = (cls: string) => /(^|\s)(relative|absolute|fixed|sticky)(\s|$)/.test(cls);

/**
 * Image with an animated shimmer placeholder that fades into the real image
 * once it has loaded. Handles already-cached images so they don't stay hidden.
 */
export default function SmartImage({ src, alt, wrapperClassName = "", className = "", ...rest }: SmartImageProps) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // If the image is served from cache, `onLoad` may fire before React attaches
  // the handler — detect that case on mount / when the source changes.
  useEffect(() => {
    setLoaded(false);
    if (imgRef.current?.complete) setLoaded(true);
  }, [src]);

  return (
    <div className={`${hasPosition(wrapperClassName) ? "" : "relative"} overflow-hidden ${wrapperClassName}`}>
      <div
        aria-hidden="true"
        className={`absolute inset-0 ace-shimmer transition-opacity duration-500 ${loaded ? "opacity-0" : "opacity-100"}`}
      />
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        className={`${className} transition-opacity duration-700 ease-out ${loaded ? "opacity-100" : "opacity-0"}`}
        {...rest}
      />
    </div>
  );
}

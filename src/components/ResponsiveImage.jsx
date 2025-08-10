export default function ResponsiveImage({
  base,        // e.g. "pondfront"
  alt,
  aspectW,     // e.g. 4
  aspectH,     // e.g. 3
  sizes        // e.g. "(max-width: 768px) 100vw, 300px"
}) {
  const avif = `/images/optimized/${base}-320.avif 320w, /images/optimized/${base}-480.avif 480w, /images/optimized/${base}-640.avif 640w, /images/optimized/${base}-768.avif 768w, /images/optimized/${base}-1024.avif 1024w`;
  const webp = `/images/optimized/${base}-320.webp 320w, /images/optimized/${base}-480.webp 480w, /images/optimized/${base}-640.webp 640w, /images/optimized/${base}-768.webp 768w, /images/optimized/${base}-1024.webp 1024w`;
  const jpg  = `/images/optimized/${base}-1024.jpg`;

  return (
    <picture>
      <source type="image/avif" srcSet={avif} sizes={sizes} />
      <source type="image/webp" srcSet={webp} sizes={sizes} />
      <img
        src={jpg}
        alt={alt}
        loading="lazy"
        decoding="async"
        style={{ width: "100%", height: "auto", objectFit: "cover" }}
      />
    </picture>
  );
}

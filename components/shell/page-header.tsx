import type { ReactNode } from "react";
import Image, { type StaticImageData } from "next/image";

type HeaderImage = { src: StaticImageData; alt: string; credit: string; position?: string };

/**
 * Page title block. With an image it becomes a full-width photographic band whose lower edge
 * fades into the page, so the title sits on the photograph and the content flows on beneath it.
 */
export function PageHeader({
  title,
  description,
  actions,
  image,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  image?: HeaderImage;
}) {
  const text = (
    <div className="max-w-[46rem] space-y-4">
      <h1 className="text-[2.5rem] leading-[1.06] sm:text-[3.25rem]">{title}</h1>
      {description && <p className="text-[1.125rem] leading-relaxed text-foreground/75 sm:text-[1.25rem]">{description}</p>}
    </div>
  );

  if (!image) {
    return (
      <header className="mb-14 flex flex-col gap-6 pt-6 sm:flex-row sm:items-end sm:justify-between">
        {text}
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </header>
    );
  }

  return (
    <header className="full-bleed -mt-14 mb-14 overflow-hidden">
      <div className="relative flex min-h-[26rem] items-end sm:min-h-[32rem]">
        <Image
          src={image.src}
          alt={image.alt}
          fill
          preload
          placeholder="blur"
          sizes="100vw"
          className="fs-settle object-cover"
          style={{ objectPosition: image.position ?? "center" }}
        />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/20 to-transparent" />
        <div className="relative mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-5 pb-12 sm:flex-row sm:items-end sm:justify-between sm:px-8 lg:px-10">
          {text}
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
        <p className="absolute right-4 top-3 text-[0.6875rem] text-white/55">{image.credit}</p>
      </div>
    </header>
  );
}

/** Slides da apresentação institucional */

export interface SlideDef {
  id: string;
  url: string;
}

const images = import.meta.glob("@/assets/slides/*.jpg", {
  eager: true,
  import: "default",
});

export const SLIDES: SlideDef[] = Object.entries(images)
  .sort(([a], [b]) =>
    a.localeCompare(b, undefined, {
      numeric: true,
      sensitivity: "base",
    })
  )
  .map(([_, url], index) => ({
    id: `slide-${index + 1}`,
    url: url as string,
  }));
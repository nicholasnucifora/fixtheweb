export type PagePreset = "a" | "b";
export const presetStoragePrefix = "ftw.page-preset.v1:";
export const previewPages = [
  { path: "/", label: "Homepage", a: "First version", b: "Broader mission" },
  { path: "/work/villow", label: "Villow", a: "First version", b: "Project & policy" },
  { path: "/notes/design-and-access", label: "Design & access", a: "First version", b: "The changes we want" },
  { path: "/ideas", label: "Ideas", a: "New page · overview", b: "New page · full proposals" },
  { path: "/about", label: "About", a: "New page · short introduction", b: "New page · full story" },
];
export const normalisePagePath = (path: string) => path.replace(/\/+$/, "") || "/";
export function getPagePreset(url: URL): PagePreset {
  return url.searchParams.get("preset")?.toLowerCase() === "a" ? "a" : "b";
}

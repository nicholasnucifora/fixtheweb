export type PagePreset = "a" | "b" | "c" | "d" | "e";
type PreviewPage = { path: string; label: string; a: string; b: string; c?: string; d?: string; e?: string };
export const presetStoragePrefix = "ftw.page-preset.v1:";
export const previewPages: PreviewPage[] = [
  { path: "/", label: "Homepage", a: "First version", b: "Broader mission" },
  { path: "/work/villow", label: "Villow", a: "First version", b: "Project & policy", c: "Principles at a glance", d: "Illustrated principles", e: "Explore the principles" },
  { path: "/notes/design-and-access", label: "Design & access", a: "First version", b: "The changes we want" },
  { path: "/ideas", label: "Ideas", a: "New page · overview", b: "New page · full proposals" },
  { path: "/about", label: "About", a: "New page · short introduction", b: "New page · full story" },
];
export const normalisePagePath = (path: string) => path.replace(/\/+$/, "") || "/";
export function getPagePresets(path: string): PagePreset[] {
  const page = previewPages.find(page => page.path === normalisePagePath(path));
  return page ? (["a", "b", "c", "d", "e"] as PagePreset[]).filter(preset => !!page[preset]) : ["a", "b"];
}
export function resolvePagePreset(path: string, value: string | null | undefined): PagePreset {
  const candidate = value?.toLowerCase() as PagePreset;
  return getPagePresets(path).includes(candidate) ? candidate : "b";
}
export function getPagePreset(url: URL): PagePreset {
  return resolvePagePreset(url.pathname, url.searchParams.get("preset"));
}

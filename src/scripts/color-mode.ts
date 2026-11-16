/** Canvas drawings use the same effective theme as the page, including the nav switch. */
export function pageColorMode() {
  const system = matchMedia("(prefers-color-scheme: dark)");
  return {
    get matches() {
      const choice = document.documentElement.dataset.colorMode;
      return choice === "dark" || (choice !== "light" && system.matches);
    },
    addEventListener(_type: "change", callback: () => void) {
      system.addEventListener("change", callback);
      window.addEventListener("ftw:color-mode", callback);
    },
  };
}

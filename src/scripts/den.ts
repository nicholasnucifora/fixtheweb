import { config } from "./spider-string/config";
import { getFigure } from "./spider-string/figure";
import { drawSnack, type Snack } from "./spider-string/food";
import { LOOK_EVENT, ateSnack, isUnlocked, setLook, snacks, trying, wear } from "./spider-string/look";
import {
  PALETTE,
  PATTERNS,
  SKINS,
  SLOTS,
  THREADS,
  blankLook,
  itemOf,
  unlockLabel,
  type Look,
  type Slot,
  type Tint,
} from "./spider-string/wardrobe";

/**
 * The Spider Den's wardrobe (src/pages/den.astro).
 *
 * Picking something dresses the den's spider in it straight away, and saves it as what the spider
 * wears everywhere (look.ts). Something locked can still be tried on here: the den's spider wears
 * it, but it isn't saved until it's unlocked. Tiles are pictures of the spider in your current look
 * with that item swapped in, redrawn whenever the look changes.
 */

type View = [x: number, y: number, w: number, h: number];

/** The part of the spider (art units) each kind of tile shows. */
const VIEWS: Record<string, View> = {
  hat: [-20, -250, 636, 520],
  eyes: [110, 70, 376, 250],
  face: [110, 60, 376, 290],
  outfit: [70, 150, 456, 350],
  back: [-140, -130, 876, 650],
  feet: [-20, 20, 636, 400],
  whole: [-30, -30, 656, 470],
};

const dark = matchMedia("(prefers-color-scheme: dark)");
const DEFAULT_NAME = blankLook().name;

export function mountDen() {
  const wardrobe = document.querySelector<HTMLElement>(".wardrobe");
  if (!wardrobe) return;
  const $$ = <T extends Element = HTMLElement>(selector: string, within: ParentNode = wardrobe) => [...within.querySelectorAll<T>(selector)] as T[];
  const notice = wardrobe.querySelector<HTMLElement>("[data-den-notice]")!;
  const nameInput = wardrobe.querySelector<HTMLInputElement>("[data-den-name-input]")!;
  const slotEl = document.querySelector<HTMLElement>("[data-den-slot]");

  // Snacks make it bigger, but here that shouldn't take it out of its stage. And this spider's big
  // enough that snacks sized for the logo's would be the size of its head.
  config.feed.maxSize = Math.min(config.feed.maxSize, 1.6);
  config.feed.flySize *= 0.6;

  const nameOf = () => trying.name.trim() || DEFAULT_NAME;
  const say = (html: string) => (notice.innerHTML = html);
  const escape = (text: string) => text.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
  const play = (id: string, detail: object = {}) =>
    document.dispatchEvent(new CustomEvent("spider:play", { detail: { id, ...detail } }));

  // ── Tabs ──────────────────────────────────────────────────────────────────
  const tabs = $$<HTMLButtonElement>('[role="tab"]');
  const panelOf = (tab: HTMLElement) => document.getElementById(tab.getAttribute("aria-controls") ?? "")!;
  const showTab = (tab: HTMLButtonElement, focus = false) => {
    for (const t of tabs) {
      const on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      panelOf(t).hidden = !on;
    }
    if (focus) tab.focus();
    drawTiles();
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => showTab(tab));
    tab.addEventListener("keydown", (e) => {
      const keys: Record<string, number> = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 };
      const to = keys[e.key];
      if (to === undefined) return;
      e.preventDefault();
      showTab(tabs[(to + tabs.length) % tabs.length], true);
    });
  });

  // ── Pictures ──────────────────────────────────────────────────────────────
  /** The look a tile shows: what's on now, with its own choice swapped in. */
  const previewFor = (tile: HTMLElement): Look => {
    const look: Look = { ...trying, items: { ...trying.items }, tints: { ...trying.tints } };
    const { slot, item, skin, pattern } = tile.dataset;
    if (slot && item) {
      const s = slot as Slot;
      if (item !== trying.items[s]) look.tints[s] = itemOf(s, item)?.tint ?? look.tints[s];
      look.items[s] = item;
    }
    // Colour tiles are about the body, so they leave off anything that would crowd it out of the picture.
    if (skin || pattern) look.items = { ...look.items, hat: "none", back: "none" };
    if (skin) look.skin = skin as Look["skin"];
    if (pattern) look.pattern = pattern as Look["pattern"];
    return look;
  };

  const fitCanvas = (canvas: HTMLCanvasElement) => {
    const ratio = window.devicePixelRatio || 1;
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return null;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { ctx, width, height };
  };

  const drawTile = (canvas: HTMLCanvasElement) => {
    const fit = fitCanvas(canvas);
    if (!fit) return;
    const { ctx, width, height } = fit;
    const icon = canvas.dataset.icon as Snack | undefined;
    if (icon) {
      drawSnack(ctx, icon, width / 2, height / 2, Math.min(width, height) * 0.62, 1.2);
      return;
    }
    const [vx, vy, vw, vh] = VIEWS[canvas.dataset.view ?? "whole"] ?? VIEWS.whole;
    const scale = Math.min(width / vw, height / vh);
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);
    ctx.translate(-(vx + vw / 2), -(vy + vh / 2));
    getFigure().draw(ctx, previewFor(canvas.closest<HTMLElement>(".tile")!), dark.matches);
  };

  /** Draws the tiles in the open tab; the rest wait until they're opened. */
  const drawTiles = () => {
    const open = tabs.find((t) => t.getAttribute("aria-selected") === "true");
    if (open) $$<HTMLCanvasElement>("canvas.tile-art", panelOf(open)).forEach(drawTile);
  };

  // ── Choosing ──────────────────────────────────────────────────────────────
  const tryOn = (slot: Slot, id: string) => {
    const item = itemOf(slot, id);
    if (id !== trying.items[slot] && item?.tint) trying.tints[slot] = item.tint;
    trying.items[slot] = id;
    wear();
    if (!item || isUnlocked(slot, id)) {
      say("Saved in this browser: it wears this on every page.");
    } else {
      const need = item.unlock!;
      const how =
        need.kind === "snacks"
          ? `Feed ${escape(nameOf())} ${need.count} snacks to keep it (${need.count - snacks()} to go).`
          : `${unlockLabel(need)} to keep it. That's coming soon.`;
      say(`<strong>Just trying on the ${escape(item.label.toLowerCase())}.</strong> ${how}`);
    }
  };

  for (const tile of $$<HTMLButtonElement>(".tile[data-item]")) {
    tile.addEventListener("click", () => tryOn(tile.dataset.slot as Slot, tile.dataset.item!));
  }
  for (const swatch of $$<HTMLButtonElement>(".swatch")) {
    swatch.addEventListener("click", () => {
      trying.tints[swatch.dataset.slot as Slot] = swatch.dataset.tint as Tint;
      wear();
    });
  }
  for (const tile of $$<HTMLButtonElement>("[data-skin], [data-pattern], [data-thread]")) {
    tile.addEventListener("click", () => {
      const { skin, pattern, thread } = tile.dataset;
      if (skin) trying.skin = skin as Look["skin"];
      if (pattern) trying.pattern = pattern as Look["pattern"];
      if (thread) trying.thread = thread as Look["thread"];
      wear();
    });
  }

  nameInput.addEventListener("input", () => {
    trying.name = nameInput.value.slice(0, 24);
    wear();
  });

  const pick = <T>(list: T[]) => list[Math.floor(Math.random() * list.length)];
  wardrobe.querySelector("[data-den-surprise]")?.addEventListener("click", () => {
    for (const slot of Object.keys(SLOTS) as Slot[]) {
      const open = SLOTS[slot].items.filter((item) => isUnlocked(slot, item.id));
      const item = Math.random() < (slot === "hat" ? 0.85 : 0.5) ? pick(open) : null;
      trying.items[slot] = item?.id ?? "none";
      trying.tints[slot] = item?.tint ? pick(Object.keys(PALETTE) as Tint[]) : trying.tints[slot];
    }
    trying.skin = Math.random() < 0.5 ? "ink" : pick(Object.keys(SKINS) as Look["skin"][]);
    trying.pattern = Math.random() < 0.7 ? "none" : pick(Object.keys(PATTERNS) as Look["pattern"][]);
    trying.thread = Math.random() < 0.7 ? "silk" : pick(Object.keys(THREADS) as Look["thread"][]);
    wear();
    say(`Ta-da. ${escape(nameOf())} has never looked better.`);
    play("faceExcited");
  });
  wardrobe.querySelector("[data-den-undress]")?.addEventListener("click", () => {
    setLook(trying, { ...blankLook(), name: trying.name });
    wear();
    say("Back to basics.");
    play("faceSurprised");
  });

  // ── Snacks, tricks and moods ──────────────────────────────────────────────
  for (const button of $$<HTMLButtonElement>("[data-snack]")) {
    button.addEventListener("click", () => {
      const kind = button.dataset.snack as Snack;
      // Beside the spider, on whichever side has room.
      const r = slotEl?.getBoundingClientRect();
      const width = document.documentElement.clientWidth;
      let x = r ? r.right + r.width * 0.45 : undefined;
      if (r && x !== undefined && x > width - 40) x = r.left - r.width * 0.45;
      play("feed", { kind, x, y: r ? r.top - r.height * 0.1 : undefined });
      say(`Drag the ${kind} to ${escape(nameOf())}'s mouth.`);
    });
  }
  for (const button of $$<HTMLButtonElement>("[data-play]")) {
    button.addEventListener("click", () => play(button.dataset.play!));
  }
  wardrobe.querySelector("[data-den-reset]")?.addEventListener("click", () => document.dispatchEvent(new CustomEvent("spider:reset")));

  document.addEventListener("spider:eat", () => {
    // Counting it saves the look, which refreshes everything.
    const unlocked = ateSnack();
    if (unlocked.length) {
      const names = unlocked.map(({ item }) => `the ${escape(item.label.toLowerCase())}`).join(" and ");
      say(`<strong>Yum! You unlocked ${names}.</strong> It's in the wardrobe now.`);
    } else {
      say(pick(["Yum.", "Crunchy.", "Delicious.", "Another!", "Mmm, protein."]));
    }
  });

  // ── Keeping it all up to date ─────────────────────────────────────────────
  const refresh = () => {
    for (const tile of $$<HTMLButtonElement>(".tile[data-item]")) {
      const slot = tile.dataset.slot as Slot;
      tile.setAttribute("aria-pressed", String(trying.items[slot] === tile.dataset.item));
      tile.toggleAttribute("data-locked", !isUnlocked(slot, tile.dataset.item!));
    }
    for (const group of $$<HTMLElement>("[data-swatches]")) {
      const slot = group.dataset.swatches as Slot;
      group.hidden = !itemOf(slot, trying.items[slot])?.tint;
      for (const swatch of $$<HTMLButtonElement>(".swatch", group)) {
        swatch.setAttribute("aria-pressed", String(trying.tints[slot] === swatch.dataset.tint));
      }
    }
    for (const tile of $$<HTMLButtonElement>("[data-skin]")) tile.setAttribute("aria-pressed", String(trying.skin === tile.dataset.skin));
    for (const tile of $$<HTMLButtonElement>("[data-pattern]")) {
      tile.setAttribute("aria-pressed", String(trying.pattern === tile.dataset.pattern));
    }
    for (const chip of $$<HTMLButtonElement>("[data-thread]")) chip.setAttribute("aria-pressed", String(trying.thread === chip.dataset.thread));

    for (const el of document.querySelectorAll("[data-den-name]")) el.textContent = nameOf();
    if (document.activeElement !== nameInput) nameInput.value = trying.name;

    const eaten = snacks();
    wardrobe.querySelector("[data-den-snack-count]")!.textContent = String(eaten);
    wardrobe.querySelector("[data-den-snack-word]")!.textContent = eaten === 1 ? "snack" : "snacks";
    for (const row of $$<HTMLElement>("[data-progress-item]")) {
      const count = Number(row.dataset.count);
      const done = Math.min(count, eaten);
      row.querySelector<HTMLElement>(".progress-bar span")!.style.setProperty("--done", `${(done / count) * 100}%`);
      row.querySelector(".progress-count")!.textContent = done >= count ? "Unlocked" : `${done} / ${count}`;
    }
    drawTiles();
  };

  // Whenever the look changes (here, as it's saved, or in another tab), or the colour scheme flips
  // (tiles have a dark-mode outline).
  document.addEventListener(LOOK_EVENT, refresh);
  dark.addEventListener("change", drawTiles);
  let resized = 0;
  window.addEventListener("resize", () => {
    cancelAnimationFrame(resized);
    resized = requestAnimationFrame(drawTiles);
  });

  refresh();
}

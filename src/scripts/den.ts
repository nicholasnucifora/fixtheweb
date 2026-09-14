import {
  COLONY_EVENT,
  byId,
  canLay,
  dressMain,
  dressSpider,
  dressing,
  elderness,
  feed,
  grownUp,
  makeMain,
  makeOld,
  members,
  nameOf,
  picked,
  pickSpider,
  reroll,
  setGenes,
  sizeOf,
  starve,
  wear,
  type Member,
} from "./den/colony";
import { den, groups as denGroups, schema as denSchema } from "./den/config";
import { DEATHS_EVENT, causeText, clearLog, deaths, markSeen, unseen, type Death } from "./den/deaths";
import { clockText } from "./den/daytime";
import { REPLAYS_EVENT, hasReplay, loadReplay } from "./den/replays";
import { FEELINGS, LIMITS, TRAITS, patternRarity, skinRarity, traitWords, type Feeling, type Trait } from "./den/genes";
import type { SceneId } from "./den/scenes";
import { AMOUNTS, SETTINGS_EVENT, change, settings, type Amount, type DenSettings } from "./den/settings";
import { createWorld } from "./den/world";
import { config } from "./spider-string/config";
import { getFigure } from "./spider-string/figure";
import { drawSnack, type Snack } from "./spider-string/food";
import { LOOK_EVENT, ateSnack, isUnlocked, redeemCode, setLook, snacks, trying } from "./spider-string/look";
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
 * The Spider Den (src/pages/den.astro): its two views, and the wardrobe they share.
 *
 * Dress up: the picked spider (or the main one) hangs from a web, big, next to the wardrobe. The den:
 * every spider you have, living on webs across the whole page (den/world.ts), with a card for the
 * picked one, if any, and the wardrobe in a drawer.
 *
 * Clicking something in the wardrobe dresses the spider being dressed in it straight away, and saves
 * it (den/colony.ts). In the den, anything in the wardrobe can also be dragged onto any spider, picked
 * or not; with nobody picked, that's the only way, and the wardrobe's pictures show a plain spider.
 * The main spider's look is the one worn all over the site. Something locked can still be tried on
 * by the spider being dressed, but it isn't saved until it's unlocked. Tiles are pictures of the
 * spider in its current look with that item swapped in, redrawn whenever the look changes.
 *
 * The den also has its settings (time speed, flies, predators, fights) behind the ⚙ in its bar, a log
 * of deaths at the top right (with a replay of each death the den saw), and a box for codes. A spider's colours are in its genes: den-born
 * spiders can't change them in the wardrobe (the first spider can).
 *
 * With ?tune, the den's own tuning panel (den/config.ts), a cut tool in the bar, and a genes editor on
 * the picked spider's card. The spider's own settings are tuned on the home page.
 */

type View = [x: number, y: number, w: number, h: number];
type DenView = "dress" | "den";

/** The part of the spider (art units) each kind of tile shows. */
const VIEWS: Record<string, View> = {
  hat: [-20, -250, 636, 520],
  eyes: [110, 70, 376, 250],
  face: [110, 60, 376, 290],
  outfit: [70, 150, 456, 350],
  back: [-140, -130, 876, 650],
  feet: [-20, 20, 636, 400],
  costume: [-120, -130, 836, 700],
  whole: [-30, -30, 656, 470],
};

const VIEW_KEY = "den:view";
const DRAWER_KEY = "den:wardrobe";
const dark = matchMedia("(prefers-color-scheme: dark)");
const DEFAULT_NAME = blankLook().name;

export function mountDen() {
  const main = document.querySelector<HTMLElement>(".den");
  const wardrobe = document.querySelector<HTMLElement>(".wardrobe");
  if (!main || !wardrobe) return;

  if (new URLSearchParams(location.search).has("tune")) {
    import("./spider-string/tune").then((m) =>
      m.mountTuner({
        values: den as unknown as Record<string, Record<string, number | boolean | string>>,
        schema: denSchema,
        groups: denGroups,
        key: "den:tune",
        title: "Den tuning",
        intro:
          "Just what's special to the den: its webs, the spiders' habits and strings, their lives and the flies. " +
          "How the spiders themselves move, look and feel is shared with the whole site: tune that on the home page with ?tune (saved tweaks from there apply here too). " +
          "b here is the den's own: a grown-up spider is 0.48 b wide, like the home page's by default. " +
          "Changes are saved in this browser, but only while ?tune is in the URL. Copy changes and paste them to Claude (or into den/config.ts) to make them the defaults.",
      }),
    );
  }

  const $$ = <T extends Element = HTMLElement>(selector: string, within: ParentNode = wardrobe) => [...within.querySelectorAll<T>(selector)] as T[];
  const notice = wardrobe.querySelector<HTMLElement>("[data-den-notice]")!;
  const nameInput = wardrobe.querySelector<HTMLInputElement>("[data-den-name-input]")!;
  const slotEl = document.querySelector<HTMLElement>("[data-den-slot]");
  const stageRig = document.querySelector<HTMLElement>('.spider-string[data-mode="stage"]');
  const card = document.querySelector<HTMLElement>("[data-den-card]")!;
  const cardNote = card.querySelector<HTMLElement>("[data-card-note]")!;
  const picker = document.querySelector<HTMLElement>("[data-den-picker]")!;

  // Snacks make it bigger, but here that shouldn't take it out of its stage. And this spider's big
  // enough that snacks sized for the logo's would be the size of its head.
  config.feed.maxSize = Math.min(config.feed.maxSize, 1.6);
  config.feed.flySize *= 0.6;

  const nameOfTrying = () => trying.name.trim() || DEFAULT_NAME;
  const escape = (text: string) => text.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
  const say = (html: string) => {
    notice.innerHTML = html;
    cardNote.innerHTML = html;
  };
  const play = (id: string, detail: object = {}) =>
    document.dispatchEvent(new CustomEvent("spider:play", { detail: { id, ...detail } }));

  const world = createWorld(document.querySelector<HTMLElement>("[data-den-world]")!, {
    pick: (id) => {
      if ((picked()?.id ?? null) !== id) pickSpider(id);
    },
    say,
  });

  // ── The two views ─────────────────────────────────────────────────────────
  let view: DenView = "dress";
  const showView = (to: DenView, remember = true) => {
    view = to;
    main.dataset.denView = to;
    document.documentElement.dataset.denView = to;
    for (const button of document.querySelectorAll<HTMLButtonElement>("[data-den-show]")) {
      button.setAttribute("aria-pressed", String(button.dataset.denShow === to));
    }
    // The big spider's rig keeps its hands off the page while the den is showing.
    stageRig?.toggleAttribute("data-inactive", to === "den");
    // Dress up always has a spider to dress: the main one, if nobody's picked. The den can have nobody.
    dressMain(to === "dress");
    world.setActive(to === "den");
    if (to !== "den") {
      showSettings(false);
      showDeaths(false);
    }
    if (remember) {
      try {
        localStorage.setItem(VIEW_KEY, to);
      } catch {
        // ignore
      }
    }
    refresh();
  };
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-den-show]")) {
    button.addEventListener("click", () => showView(button.dataset.denShow as DenView));
  }

  const sceneButtons = [...document.querySelectorAll<HTMLButtonElement>("[data-den-scene]")];
  const showScene = () => {
    for (const button of sceneButtons) button.setAttribute("aria-pressed", String(button.dataset.denScene === world.scene));
  };
  for (const button of sceneButtons) {
    button.addEventListener("click", () => {
      world.setScene(button.dataset.denScene as SceneId);
      showScene();
    });
  }
  showScene();

  const setDrawer = (open: boolean, remember = true) => {
    main.dataset.wardrobe = open ? "open" : "closed";
    document.querySelector("[data-den-wardrobe-toggle]")?.setAttribute("aria-expanded", String(open));
    if (open) drawTiles();
    if (remember) {
      try {
        localStorage.setItem(DRAWER_KEY, open ? "open" : "closed");
      } catch {
        // ignore
      }
    }
  };
  document.querySelector("[data-den-wardrobe-toggle]")?.addEventListener("click", () => setDrawer(main.dataset.wardrobe !== "open"));
  wardrobe.querySelector("[data-den-wardrobe-close]")?.addEventListener("click", () => setDrawer(false));

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

  /** The spider in `look`, fitted to the canvas (a `view` of it), `scale` of the size. False if the canvas isn't showing. */
  const drawSpider = (canvas: HTMLCanvasElement, look: Look, view: View = VIEWS.whole, scale = 1) => {
    const fit = fitCanvas(canvas);
    if (!fit) return false;
    const { ctx, width, height } = fit;
    const [vx, vy, vw, vh] = view;
    const s = Math.min(width / vw, height / vh) * scale;
    ctx.translate(width / 2, height / 2);
    ctx.scale(s, s);
    ctx.translate(-(vx + vw / 2), -(vy + vh / 2));
    getFigure().draw(ctx, look, dark.matches);
    return true;
  };

  const drawTile = (canvas: HTMLCanvasElement) => {
    const icon = canvas.dataset.icon as Snack | undefined;
    if (icon) {
      const fit = fitCanvas(canvas);
      if (fit) drawSnack(fit.ctx, icon, fit.width / 2, fit.height / 2, Math.min(fit.width, fit.height) * 0.62, 1.2);
      return;
    }
    drawSpider(canvas, previewFor(canvas.closest<HTMLElement>(".tile")!), VIEWS[canvas.dataset.view ?? "whole"] ?? VIEWS.whole);
  };

  /** Draws the tiles in the open tab; the rest wait until they're opened. */
  const drawTiles = () => {
    const open = tabs.find((t) => t.getAttribute("aria-selected") === "true");
    if (open) $$<HTMLCanvasElement>("canvas.tile-art", panelOf(open)).forEach(drawTile);
  };

  // ── Choosing ──────────────────────────────────────────────────────────────
  /** What a tile changes about a look. */
  const changeFor = (tile: HTMLElement) => {
    const { slot, item, skin, pattern, thread } = tile.dataset;
    return (look: Look) => {
      if (slot && item) {
        const s = slot as Slot;
        const tint = itemOf(s, item)?.tint;
        if (item !== look.items[s] && tint) look.tints[s] = tint;
        look.items[s] = item;
      }
      if (skin) look.skin = skin as Look["skin"];
      if (pattern) look.pattern = pattern as Look["pattern"];
      if (thread) look.thread = thread as Look["thread"];
    };
  };

  /** The item a tile puts on, if it's clothes that are still locked. */
  const lockedItem = (tile: HTMLElement) => {
    const { slot, item } = tile.dataset;
    return slot && item && !isUnlocked(slot as Slot, item) ? itemOf(slot as Slot, item) : null;
  };

  /** Whether a spider's colours are fixed by its genes: den-born spiders' are, unless testing. */
  const coloursLocked = (m: Member | null) => !!m && !!m.parent && den.genetics.enabled && !world.tuning;
  const isColour = (tile: HTMLElement) => !!(tile.dataset.skin || tile.dataset.pattern || tile.dataset.thread);
  const colourWords = (m: Member) => {
    const skin = SKINS[m.look.skin].label.toLowerCase();
    return m.look.pattern === "none" ? skin : `${skin} with ${PATTERNS[m.look.pattern].label.toLowerCase()}`;
  };
  const lockedColours = (m: Member) =>
    say(`<strong>${escape(nameOf(m))} was born ${escape(colourWords(m))}.</strong> Colours are in the genes: its babies take after it.`);

  /** Nobody's picked in the den, so a click has nobody to dress. */
  const nobody = () => say("<strong>Drag it onto a spider</strong> to dress it up, or pick a spider first.");

  /** A tile clicked: dresses the spider being dressed. */
  const apply = (tile: HTMLElement) => {
    const m = dressing();
    if (!m) return nobody();
    if (isColour(tile) && coloursLocked(m)) return lockedColours(m);
    changeFor(tile)(trying);
    wear();
    const locked = lockedItem(tile);
    if (!locked) {
      say(m.main ? "Saved in this browser: it wears this on every page." : `Saved in this browser: ${escape(nameOfTrying())} wears this in the den.`);
      return;
    }
    const need = locked.unlock!;
    const how =
      need.kind === "snacks"
        ? `Feed ${escape(nameOfTrying())} ${need.count} snacks to keep it (${need.count - snacks()} to go).`
        : `${unlockLabel(need)} to keep it. That's coming soon.`;
    say(`<strong>Just trying on the ${escape(locked.label.toLowerCase())}.</strong> ${how}`);
  };

  /** A tile dropped onto spider `id` in the den: it wears it, picked or not. */
  const dropOn = (tile: HTMLElement, id: string) => {
    const m = byId(id);
    if (!m) return;
    if (isColour(tile) && coloursLocked(m)) return lockedColours(m);
    world.play(id, "faceHappy");
    if (m.id === dressing()?.id) return apply(tile);
    const locked = lockedItem(tile);
    if (locked) {
      say(`<strong>The ${escape(locked.label.toLowerCase())} is locked.</strong> ${unlockLabel(locked.unlock!)} to unlock it.`);
      return;
    }
    dressSpider(id, changeFor(tile));
    const name = escape(nameOf(m));
    const { slot, item } = tile.dataset;
    const label = slot && item ? itemOf(slot as Slot, item)?.label.toLowerCase() : null;
    say(label ? `${name} is wearing the ${escape(label)}.` : item === "none" ? `${name} took it off.` : `${name} looks great.`);
  };

  /** A tile dragged out of the wardrobe in the den can be let go of over a spider. */
  let dragged = false;
  for (const tile of $$<HTMLButtonElement>(".tile[data-item], [data-skin], [data-pattern], [data-thread]")) {
    tile.addEventListener("click", () => {
      if (dragged) return;
      apply(tile);
    });
    tile.addEventListener("pointerdown", (e) => startTileDrag(tile, e));
  }
  for (const swatch of $$<HTMLButtonElement>(".swatch")) {
    swatch.addEventListener("click", () => {
      if (!dressing()) return nobody();
      trying.tints[swatch.dataset.slot as Slot] = swatch.dataset.tint as Tint;
      wear();
    });
  }

  /**
   * A picture of just what a tile puts on (the cape, not a spider in a cape), cropped to fit, for
   * dragging about. Sized like the clothes on a spider a bit bigger than the ones in the den.
   */
  const pieceImage = (tile: HTMLElement) => {
    const ratio = window.devicePixelRatio || 1;
    const size = 300;
    const scratch = document.createElement("canvas");
    scratch.width = scratch.height = Math.round(size * ratio);
    const ctx = scratch.getContext("2d", { willReadFrequently: true })!;
    const figure = getFigure();
    const s = (120 / figure.width) * ratio;
    ctx.setTransform(s, 0, 0, s, (size / 2) * ratio - (figure.width / 2) * s, (size / 2) * ratio - (figure.height / 2) * s);
    const { slot, item, skin, pattern, thread } = tile.dataset;
    const look = previewFor(tile);
    if (slot && item === "none") {
      // Taking something off: a no-entry sign.
      ctx.strokeStyle = getComputedStyle(wardrobe).color;
      ctx.lineWidth = 34;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(figure.width / 2, figure.height / 2, 120, 0, Math.PI * 2);
      ctx.moveTo(figure.width / 2 - 85, figure.height / 2 + 85);
      ctx.lineTo(figure.width / 2 + 85, figure.height / 2 - 85);
      ctx.stroke();
    } else if (slot && item) {
      figure.drawPiece(ctx, look, slot as Slot);
    } else if (skin || pattern) {
      figure.drawBody(ctx, look);
    } else if (thread) {
      const line = new Path2D("M40 250C160 40 300 400 420 180S560 120 560 120");
      const ink = getComputedStyle(wardrobe).color;
      const rainbow = ctx.createLinearGradient(40, 0, 560, 0);
      Object.values(PALETTE)
        .slice(0, 5)
        .forEach(({ color }, i) => rainbow.addColorStop(i / 4, color));
      ctx.strokeStyle = thread === "rainbow" ? rainbow : THREADS[thread as Look["thread"]]?.color || ink;
      ctx.lineWidth = 16;
      ctx.lineCap = "round";
      ctx.stroke(line);
    }
    // Cropped to what's actually drawn.
    const { data, width, height } = ctx.getImageData(0, 0, scratch.width, scratch.height);
    let [x0, y0, x1, y1] = [width, height, -1, -1];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (data[(y * width + x) * 4 + 3] < 8) continue;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
    if (x1 < 0) return null;
    const pad = Math.round(4 * ratio);
    const out = document.createElement("canvas");
    out.width = x1 - x0 + 1 + pad * 2;
    out.height = y1 - y0 + 1 + pad * 2;
    out.getContext("2d")!.drawImage(scratch, x0 - pad, y0 - pad, out.width, out.height, 0, 0, out.width, out.height);
    out.style.width = `${out.width / ratio}px`;
    out.style.height = `${out.height / ratio}px`;
    return out;
  };

  const startTileDrag = (tile: HTMLElement, down: PointerEvent) => {
    if (view !== "den" || down.button !== 0) return;
    dragged = false;
    let ghost: HTMLCanvasElement | null = null;
    let over: string | null = null;
    // On a touchscreen the drawer scrolls, so a drag starts with a moment's hold instead.
    const touch = down.pointerType === "touch";
    let ready = !touch;
    const hold = touch ? window.setTimeout(() => (ready = true), 280) : 0;

    const move = (e: PointerEvent) => {
      if (e.pointerId !== down.pointerId) return;
      const far = Math.hypot(e.clientX - down.clientX, e.clientY - down.clientY);
      if (!ghost) {
        if (touch && !ready && far > 8) return end(e, true);
        if (!ready || far < 6) return;
        dragged = true;
        ghost = pieceImage(tile) ?? document.createElement("canvas");
        ghost.className = "tile-ghost";
        document.body.append(ghost);
        try {
          tile.setPointerCapture(e.pointerId);
        } catch {
          // window listeners still see the moves
        }
        document.documentElement.classList.add("spider-held");
      }
      ghost.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
      over = world.spiderAt(e.clientX, e.clientY);
      world.highlight(over);
    };
    const end = (e: PointerEvent, cancelled = false) => {
      if (e.pointerId !== down.pointerId) return;
      window.clearTimeout(hold);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      if (!ghost) return;
      ghost.remove();
      document.documentElement.classList.remove("spider-held");
      world.highlight(null);
      const id = cancelled ? null : world.spiderAt(e.clientX, e.clientY);
      if (id) dropOn(tile, id);
      // The click that follows a drag isn't a click.
      window.setTimeout(() => (dragged = false), 0);
    };
    const up = (e: PointerEvent) => end(e);
    const cancel = (e: PointerEvent) => end(e, true);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
  };

  nameInput.addEventListener("input", () => {
    if (!dressing()) return;
    trying.name = nameInput.value.slice(0, 24);
    wear();
  });

  const pick = <T>(list: T[]) => list[Math.floor(Math.random() * list.length)];
  wardrobe.querySelector("[data-den-surprise]")?.addEventListener("click", () => {
    if (!dressing()) return say("Pick a spider to surprise.");
    for (const slot of Object.keys(SLOTS) as Slot[]) {
      const open = SLOTS[slot].items.filter((item) => isUnlocked(slot, item.id));
      const item = Math.random() < (slot === "hat" ? 0.85 : slot === "costume" ? 0.15 : 0.5) ? pick(open) : null;
      trying.items[slot] = item?.id ?? "none";
      trying.tints[slot] = item?.tint ? pick(Object.keys(PALETTE) as Tint[]) : trying.tints[slot];
    }
    if (!coloursLocked(dressing())) {
      trying.skin = Math.random() < 0.5 ? "ink" : pick(Object.keys(SKINS) as Look["skin"][]);
      trying.pattern = Math.random() < 0.7 ? "none" : pick(Object.keys(PATTERNS) as Look["pattern"][]);
      trying.thread = Math.random() < 0.7 ? "silk" : pick(Object.keys(THREADS) as Look["thread"][]);
    }
    wear();
    say(`Ta-da. ${escape(nameOfTrying())} has never looked better.`);
    playFor("faceExcited");
  });
  wardrobe.querySelector("[data-den-undress]")?.addEventListener("click", () => {
    if (!dressing()) return say("Pick a spider to undress.");
    setLook(trying, { ...blankLook(), name: trying.name, skin: trying.skin, pattern: trying.pattern, thread: trying.thread });
    wear();
    say("Back to basics.");
    playFor("faceSurprised");
  });

  // ── Snacks, tricks and moods ──────────────────────────────────────────────
  /** A trick or mood: the big spider plays it, or in the den, the picked one. */
  const playFor = (id: string) => {
    if (view !== "den") return play(id);
    const m = picked();
    if (m) world.play(m.id, id);
    else say("Pick a spider to play that.");
  };

  for (const button of $$<HTMLButtonElement>("[data-snack]")) {
    button.addEventListener("click", () => {
      const kind = button.dataset.snack as Snack;
      if (view === "den") {
        world.offer(kind, picked()?.id ?? null);
        say(`Drag the ${kind} to a spider's mouth.`);
        return;
      }
      // Beside the spider, on whichever side has room.
      const r = slotEl?.getBoundingClientRect();
      const width = document.documentElement.clientWidth;
      let x = r ? r.right + r.width * 0.45 : undefined;
      if (r && x !== undefined && x > width - 40) x = r.left - r.width * 0.45;
      play("feed", { kind, x, y: r ? r.top - r.height * 0.1 : undefined });
      say(`Drag the ${kind} to ${escape(nameOfTrying())}'s mouth.`);
    });
  }
  for (const button of $$<HTMLButtonElement>("[data-play]")) {
    button.addEventListener("click", () => playFor(button.dataset.play!));
  }
  wardrobe.querySelector("[data-den-reset]")?.addEventListener("click", () => document.dispatchEvent(new CustomEvent("spider:reset")));

  // The big spider in the dress-up view ate something you gave it.
  document.addEventListener("spider:eat", (e) => {
    if ((e.target as Element | null)?.closest?.('[data-mode="stage"]') === null) return;
    const unlocked = ateSnack(wear);
    const m = dressing();
    if (m) feed(m.id);
    if (unlocked.length) {
      const names = unlocked.map(({ item }) => `the ${escape(item.label.toLowerCase())}`).join(" and ");
      say(`<strong>Yum! You unlocked ${names}.</strong> It's in the wardrobe now.`);
    } else {
      say(pick(["Yum.", "Crunchy.", "Delicious.", "Another!", "Mmm, protein."]));
    }
  });

  // ── The picked spider's card (the den) ────────────────────────────────────
  const $card = <T extends HTMLElement = HTMLElement>(selector: string) => card.querySelector<T>(selector)!;
  const age = (m: Member) => {
    const minutes = Math.max(0, (Date.now() - m.born) / 60_000);
    if (minutes < 1) return "just hatched";
    if (minutes < 60) return `${Math.floor(minutes)} minute${Math.floor(minutes) === 1 ? "" : "s"} old`;
    const hours = minutes / 60;
    if (hours < 48) return `${Math.floor(hours)} hour${Math.floor(hours) === 1 ? "" : "s"} old`;
    return `${Math.floor(hours / 24)} days old`;
  };
  const tummy = (full: number) =>
    full >= 0.75 ? "Full" : full >= 0.45 ? "Peckish" : full >= 0.2 ? "Hungry" : full > 0 ? "Starving" : "Empty";

  $card("[data-card-close]").addEventListener("click", () => pickSpider(null));
  document.addEventListener("keydown", (e) => {
    const typing = e.target instanceof HTMLElement && e.target.closest("input, textarea, select");
    const popover = !settingsPanel.hidden || !deathsPanel.hidden;
    if (e.key === "Escape" && view === "den" && picked() && !typing && !popover) pickSpider(null);
  });
  $card("[data-card-dress]").addEventListener("click", () => {
    setDrawer(true);
    wardrobe.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.focus();
  });
  $card("[data-card-feed]").addEventListener("click", () => {
    const m = picked();
    if (!m) return;
    world.offer("fly", m.id);
    say(`Drag the fly to ${escape(nameOf(m))}'s mouth.`);
  });
  $card("[data-card-lay]").addEventListener("click", () => {
    const m = picked();
    if (!m) return;
    const why = world.layEggs(m.id);
    say(why ? `${escape(why)}.` : `<strong>${escape(nameOf(m))} laid a clutch of eggs!</strong> Keep an eye on the egg sac.`);
    refreshCard();
  });
  $card("[data-card-make-main]").addEventListener("click", () => {
    const m = picked();
    if (!m) return;
    makeMain(m.id);
    say(`<strong>${escape(nameOf(m))} is your main spider now.</strong> It's the one on the logo and in the header.`);
  });

  /** Somebody by id, alive or remembered. */
  const nameById = (id: string) => {
    const alive = byId(id);
    return alive ? nameOf(alive) : (deaths().find((d) => d.id === id)?.name ?? null);
  };

  /** What it's like, in a few words: its genes and personality, and anything worth knowing now. */
  let traitsKey = "";
  const refreshTraits = (m: Member) => {
    const words: [string, string?][] = traitWords(m.genes, m.personality).map((w) => [w]);
    if (skinRarity(m.genes.skin) >= 0.7 || patternRarity(m.genes.pattern) >= 0.75) words.unshift(["Rare colours", "rare"]);
    if (elderness(m) > 0.6) words.unshift(["Very old", "warn"]);
    if (m.starving > 0) words.unshift(["Starving: feed it soon", "warn"]);
    if (m.kills) words.push([`Has eaten ${m.kills} spider${m.kills === 1 ? "" : "s"}`]);
    const key = JSON.stringify(words);
    if (key === traitsKey) return;
    traitsKey = key;
    $card("[data-card-traits]").replaceChildren(
      ...words.map(([word, tone]) => {
        const li = document.createElement("li");
        li.textContent = word;
        if (tone) li.dataset.tone = tone;
        return li;
      }),
    );
  };

  // With ?tune, the picked spider's genes, to change and see what they do.
  const genesBox = $card<HTMLDetailsElement>("[data-card-genes]");
  genesBox.hidden = !world.tuning;
  const geneInputs = new Map<string, HTMLInputElement | HTMLSelectElement>();
  if (world.tuning) {
    const grid = genesBox.querySelector<HTMLElement>("[data-genes-grid]")!;
    const heading = (text: string) => {
      const h = document.createElement("h3");
      h.textContent = text;
      grid.append(h);
    };
    const WORDS: Record<Trait | Feeling, string> = {
      speed: "Speed", appetite: "Appetite", silk: "Silk", strength: "Strength", size: "Size", lifespan: "Lifespan", fertility: "Fertility",
      temper: "Temper", thrill: "Thrill", nerve: "Nerve", aggression: "Aggression", energy: "Energy", tidiness: "Tidiness",
    };
    const slider = (key: Trait | Feeling, min: number, max: number, set: (m: Member, v: number) => void) => {
      const label = document.createElement("label");
      label.textContent = WORDS[key];
      const input = document.createElement("input");
      Object.assign(input, { type: "range", min: String(min), max: String(max), step: "0.01", id: `den-gene-${key}` });
      label.htmlFor = input.id;
      const out = document.createElement("output");
      input.addEventListener("input", () => {
        const m = picked();
        out.textContent = Number(input.value).toFixed(2);
        if (m) set(m, Number(input.value));
      });
      geneInputs.set(key, input);
      grid.append(label, input, out);
    };
    heading("Genes (1 = average)");
    for (const t of TRAITS) slider(t, LIMITS[t][0], LIMITS[t][1], (m, v) => setGenes(m.id, { [t]: v } as Partial<Record<Trait, number>>));
    heading("Colours");
    const choice = (key: "skin" | "pattern" | "thread", options: Record<string, { label: string }>) => {
      const label = document.createElement("label");
      label.textContent = key === "skin" ? "Body" : key === "pattern" ? "Pattern" : "Thread";
      const select = document.createElement("select");
      select.id = `den-gene-${key}`;
      label.htmlFor = select.id;
      for (const [id, { label: text }] of Object.entries(options)) select.add(new Option(text, id));
      select.addEventListener("change", () => {
        const m = picked();
        if (m) setGenes(m.id, { [key]: select.value } as Parameters<typeof setGenes>[1]);
      });
      geneInputs.set(key, select);
      grid.append(label, select);
    };
    choice("skin", SKINS);
    choice("pattern", PATTERNS);
    choice("thread", THREADS);
    heading("Personality (0 to 1)");
    for (const f of FEELINGS) slider(f, 0, 1, (m, v) => setGenes(m.id, {}, { [f]: v } as Partial<Record<Feeling, number>>));
    const act = (selector: string, run: (m: Member) => void) =>
      genesBox.querySelector(selector)!.addEventListener("click", () => {
        const m = picked();
        if (m) run(m);
      });
    act("[data-genes-reroll]", (m) => reroll(m.id));
    act("[data-genes-colours]", (m) => reroll(m.id, true));
    act("[data-genes-old]", (m) => makeOld(m.id));
    act("[data-genes-starve]", (m) => starve(m.id));
  }
  const refreshGenes = (m: Member) => {
    if (!world.tuning || !genesBox.open) return;
    const values: Record<string, number | string> = { ...m.genes, ...m.personality };
    for (const [key, input] of geneInputs) {
      if (document.activeElement === input) continue;
      input.value = String(values[key]);
      const out = input.nextElementSibling;
      if (out instanceof HTMLOutputElement) out.textContent = Number(values[key]).toFixed(2);
    }
  };
  genesBox.addEventListener("toggle", () => {
    const m = picked();
    if (m) refreshGenes(m);
  });

  let portraitKey = "";
  const refreshCard = () => {
    const m = picked();
    card.hidden = !m;
    if (!m) return;
    $card("[data-card-name]").textContent = nameOf(m);
    $card("[data-card-main]").hidden = !m.main;
    $card("[data-card-make-main]").hidden = m.main;
    const stage = elderness(m) > 0 ? "Old" : grownUp(m) ? "Grown up" : m.growth < 0.35 ? "Baby" : "Growing up";
    // The spider that was here before the den had babies didn't hatch here.
    $card("[data-card-age]").textContent = `${stage} · ${m.parent || !m.main ? age(m) : "here from the start"}`;
    const growth = $card("[data-card-growth]");
    growth.hidden = grownUp(m);
    growth.querySelector<HTMLElement>(".meter-bar span")!.style.setProperty("--done", `${Math.round(m.growth * 100)}%`);
    growth.querySelector(".meter-value")!.textContent = `${Math.round(m.growth * 100)}%`;
    const fullness = $card("[data-card-fullness]");
    fullness.querySelector<HTMLElement>(".meter-bar span")!.style.setProperty("--done", `${Math.round(m.fullness * 100)}%`);
    fullness.querySelector(".meter-value")!.textContent = tummy(m.fullness);
    fullness.toggleAttribute("data-low", m.fullness < 0.2);
    const family = $card("[data-card-family]");
    const parents = [m.parent, m.mate].filter((id): id is string => !!id).map(nameById);
    const known = parents.filter((n): n is string => !!n);
    const lineage = [
      known.length ? `${known.length === 2 ? "Child of" : "Baby of"} ${known.join(" and ")}` : m.parent ? "Its parents are gone" : "",
      m.generation > 0 ? `generation ${m.generation + 1}` : "",
    ].filter(Boolean);
    family.hidden = !lineage.length;
    family.textContent = lineage.join(" · ").replace(/^g/, "G");
    refreshTraits(m);
    refreshGenes(m);
    const lay = $card<HTMLButtonElement>("[data-card-lay]");
    const can = canLay(m);
    lay.hidden = !grownUp(m);
    lay.setAttribute("aria-disabled", String(!can.ok));
    lay.title = can.ok ? "" : can.why;
    const key = JSON.stringify([trying, sizeOf(m), dark.matches]);
    if (key !== portraitKey) {
      const drawn = drawSpider($card<HTMLCanvasElement>("[data-card-portrait]"), trying, VIEWS.whole, 0.55 + 0.45 * Math.min(1, sizeOf(m)));
      portraitKey = drawn ? key : "";
    }
  };

  // ── Your spiders ──────────────────────────────────────────────────────────
  let pickerKey = "";
  const refreshPicker = () => {
    const list = members();
    const on = dressing()?.id;
    const key = JSON.stringify([on, dark.matches, list.map((m) => [m.id, m.id === on ? trying : m.look, m.main, Math.round(sizeOf(m) * 20)])]);
    if (key === pickerKey) return;
    pickerKey = key;
    const buttons = new Map([...picker.querySelectorAll<HTMLButtonElement>("button")].map((b) => [b.dataset.id!, b]));
    for (const [id, button] of buttons) if (!list.some((m) => m.id === id)) button.remove();
    for (const m of list) {
      let button = buttons.get(m.id);
      if (!button) {
        button = document.createElement("button");
        button.type = "button";
        button.className = "picker-spider";
        button.dataset.id = m.id;
        button.innerHTML = `<canvas aria-hidden="true"></canvas><span class="picker-name"></span>`;
        // In the den, clicking the picked one again lets go of it.
        button.addEventListener("click", () => pickSpider(view === "den" && picked()?.id === m.id ? null : m.id));
        picker.append(button);
      }
      button.querySelector(".picker-name")!.textContent = nameOf(m);
      button.setAttribute("aria-pressed", String(m.id === on));
      button.toggleAttribute("data-main", m.main);
      button.title = m.main ? `${nameOf(m)} (main spider)` : nameOf(m);
      drawSpider(button.querySelector("canvas")!, m.id === on ? trying : m.look, VIEWS.whole, 0.5 + 0.5 * Math.min(1, sizeOf(m)));
    }
  };

  // ── The den's settings ────────────────────────────────────────────────────
  const settingsPanel = document.querySelector<HTMLElement>("[data-den-settings]")!;
  const settingsToggle = document.querySelector<HTMLButtonElement>("[data-den-settings-toggle]")!;
  const fightsBox = settingsPanel.querySelector<HTMLInputElement>("[data-den-fights]")!;
  const showSettings = (open: boolean) => {
    settingsPanel.hidden = !open;
    settingsToggle.setAttribute("aria-expanded", String(open));
    if (open) {
      showDeaths(false);
      refreshClock();
    }
  };
  const refreshSettings = () => {
    const press = (attr: string, on: (value: string) => boolean) => {
      for (const b of settingsPanel.querySelectorAll<HTMLButtonElement>(`[${attr}]`)) b.setAttribute("aria-pressed", String(on(b.getAttribute(attr)!)));
    };
    press("data-den-speed", (v) => Number(v) === settings.speed);
    press("data-den-flies", (v) => v === settings.flies);
    press("data-den-predators", (v) => v === settings.predators);
    fightsBox.checked = settings.fights;
    // Time's not at its usual speed: the bar says so.
    settingsToggle.toggleAttribute("data-changed", settings.speed !== 1);
    settingsToggle.title = settings.speed === 1 ? "Den settings" : `Den settings (time at ${settings.speed}×)`;
  };
  settingsToggle.addEventListener("click", () => showSettings(settingsPanel.hidden));
  settingsPanel.querySelector("[data-den-settings-close]")!.addEventListener("click", () => {
    showSettings(false);
    settingsToggle.focus();
  });
  settingsPanel.addEventListener("click", (e) => {
    const b = (e.target as Element).closest<HTMLButtonElement>("button");
    if (!b) return;
    if (b.dataset.denSpeed) {
      change({ speed: Number(b.dataset.denSpeed) as DenSettings["speed"] });
      say(
        settings.speed === 1
          ? "Time's back to normal."
          : settings.speed > 1
            ? `<strong>Time's running at ${settings.speed}×.</strong> Days go by faster: more flies, more visitors, hungrier spiders.`
            : `<strong>Time's running at ${settings.speed}×.</strong> Long, lazy days.`,
      );
    } else if (b.dataset.denFlies) {
      change({ flies: b.dataset.denFlies as Amount });
    } else if (b.dataset.denPredators) {
      change({ predators: b.dataset.denPredators as Amount });
      say(settings.predators === "none" ? "No more predators." : `Predators: ${AMOUNTS[settings.predators].label.toLowerCase()}.`);
    }
  });
  fightsBox.addEventListener("change", () => change({ fights: fightsBox.checked }));
  document.addEventListener(SETTINGS_EVENT, refreshSettings);
  refreshSettings();
  /** What time it is in the den, in the settings. */
  const clock = settingsPanel.querySelector<HTMLElement>("[data-den-clock]")!;
  const refreshClock = () => {
    if (!den.day.enabled) {
      clock.textContent = "";
      return;
    }
    const minutes = den.day.minutes / settings.speed;
    const length = minutes >= 1 ? `${Math.round(minutes * 10) / 10} minutes` : `${Math.round(minutes * 60)} seconds`;
    clock.textContent = `It's ${clockText()} in the den. A day takes ${length}.`;
  };

  // With ?tune, a pair of scissors for the webs.
  const cutButton = document.querySelector<HTMLButtonElement>("[data-den-cut]")!;
  cutButton.hidden = !world.tuning;
  cutButton.addEventListener("click", () => {
    const on = cutButton.getAttribute("aria-pressed") !== "true";
    world.setCutting(on);
    cutButton.setAttribute("aria-pressed", String(on));
    say(on ? "<strong>Cutting.</strong> Drag across threads to cut them. Press ✂ again to stop." : "Done cutting.");
  });

  // ── Codes ─────────────────────────────────────────────────────────────────
  for (const form of document.querySelectorAll<HTMLFormElement>("[data-den-code]")) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = form.querySelector<HTMLInputElement>("input")!;
      const note = form.querySelector<HTMLElement>("[data-code-note]")!;
      const result = redeemCode(input.value);
      note.toggleAttribute("data-ok", result.ok);
      if (!result.ok) {
        note.textContent = result.why;
        return;
      }
      input.value = "";
      const names = result.unlocked.map(({ item }) => `the ${item.label.toLowerCase()}`);
      note.textContent = names.length ? `Unlocked ${names.join(", ")}.` : "That worked, but there was nothing new to unlock.";
    });
  }

  // ── Deaths ────────────────────────────────────────────────────────────────
  const deathsBox = document.querySelector<HTMLElement>("[data-den-deaths]")!;
  const deathsToggle = deathsBox.querySelector<HTMLButtonElement>("[data-deaths-toggle]")!;
  const deathsPanel = deathsBox.querySelector<HTMLElement>("[data-deaths-panel]")!;
  const deathsList = deathsBox.querySelector<HTMLElement>("[data-deaths-list]")!;
  const deathsBadge = deathsBox.querySelector<HTMLElement>("[data-deaths-badge]")!;
  const clearButton = deathsBox.querySelector<HTMLButtonElement>("[data-deaths-clear]")!;
  /** How many at the top of the list are new since it was last opened. */
  let fresh = 0;
  let badgeWas = unseen();

  const span = (hours: number) => {
    if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
    if (hours < 48) return `${Math.round(hours)} h`;
    return `${Math.round(hours / 24)} days`;
  };
  const ago = (at: number) => {
    const seconds = Math.max(0, (Date.now() - at) / 1000);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;
    const days = Math.floor(seconds / 86400);
    return days === 1 ? "yesterday" : `${days} days ago`;
  };
  /** The details that matter for how it died: how long it went hungry, how old it got. */
  const detailOf = (d: Death) => {
    const bits: string[] = [];
    if (d.cause === "starved") bits.push(`Went hungry for ${span(d.starving)}`, `${span(d.age)} old`);
    else if (d.cause === "old") bits.push(`Lived to ${span(d.age)}`);
    else {
      bits.push(`${span(d.age)} old`);
      if (d.life >= den.aging.elderAt) bits.push("getting on");
      bits.push(`tummy ${tummy(d.fullness).toLowerCase()}`);
    }
    if (d.away) bits.push("while you were away");
    return bits.join(" · ");
  };
  const renderDeaths = () => {
    const list = deaths();
    deathsBox.querySelector<HTMLElement>("[data-deaths-empty]")!.hidden = list.length > 0;
    deathsBox.querySelector("[data-deaths-count]")!.textContent = list.length ? String(list.length) : "";
    clearButton.hidden = !list.length;
    deathsList.replaceChildren(
      ...list.map((d, i) => {
        const li = document.createElement("li");
        li.className = "death";
        li.dataset.cause = d.cause;
        li.dataset.id = d.id;
        li.toggleAttribute("data-unseen", i < fresh);
        li.innerHTML = `<canvas aria-hidden="true"></canvas><div><p class="death-name"><strong></strong><span class="death-when"></span></p><p class="death-cause"></p><p class="death-detail"></p></div>`;
        if (hasReplay(d.id)) {
          const watch = document.createElement("button");
          watch.type = "button";
          watch.className = "chip death-replay";
          watch.setAttribute("aria-expanded", String(player?.id === d.id));
          watch.innerHTML = `<span aria-hidden="true">▶</span> Replay`;
          watch.addEventListener("click", () => openReplay(li, d, watch));
          li.querySelector("div")!.append(watch);
        }
        li.querySelector("strong")!.textContent = d.main ? `${d.name} ★` : d.name;
        const when = li.querySelector<HTMLElement>(".death-when")!;
        when.textContent = ago(d.at);
        when.dataset.at = String(d.at);
        li.querySelector(".death-cause")!.textContent = causeText(d);
        li.querySelector(".death-detail")!.textContent = detailOf(d);
        return li;
      }),
    );
    deathsList.querySelectorAll<HTMLCanvasElement>(".death > canvas").forEach((canvas, i) => drawSpider(canvas, list[i].look, VIEWS.whole, 0.8));
    // A replay that's playing carries on in the new list.
    if (player) {
      const row = [...deathsList.querySelectorAll<HTMLElement>(".death")].find((li) => li.dataset.id === player!.id);
      if (row) row.append(player.el);
      else closeReplay();
    }
  };

  // ── Replays ───────────────────────────────────────────────────────────────
  let player: { id: string; el: HTMLElement; button: HTMLButtonElement; stop: () => void } | null = null;
  const closeReplay = () => {
    if (!player) return;
    player.stop();
    player.el.remove();
    player.button.setAttribute("aria-expanded", "false");
    player = null;
  };
  /** Plays the replay of `d`'s death under its row (or closes it, if it's already playing). */
  const openReplay = async (li: HTMLElement, d: Death, button: HTMLButtonElement) => {
    const again = player?.id === d.id;
    closeReplay();
    if (again) return;
    const el = document.createElement("div");
    el.className = "replay";
    el.innerHTML = `<canvas role="img"></canvas><div class="replay-bar"><button type="button" class="replay-play" aria-label="Pause">❚❚</button><span class="replay-track" role="slider" tabindex="0" aria-label="Seek" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span class="replay-done"></span><span class="replay-mark" title="The moment it died"></span></span></div>`;
    el.querySelector("canvas")!.setAttribute("aria-label", `Replay: ${d.name}, ${causeText(d).toLowerCase()}`);
    li.append(el);
    button.setAttribute("aria-expanded", "true");
    let stopped = false;
    let raf = 0;
    let pictures: ImageBitmap[] = [];
    player = {
      id: d.id,
      el,
      button,
      stop: () => {
        stopped = true;
        cancelAnimationFrame(raf);
        for (const p of pictures) p.close();
      },
    };
    const replay = await loadReplay(d.id);
    if (stopped) return;
    try {
      if (!replay) throw new Error("gone");
      pictures = await Promise.all(replay.frames.map((blob) => createImageBitmap(blob)));
    } catch {
      el.textContent = "This replay can't be played any more.";
      return;
    }
    if (stopped || !replay) {
      for (const p of pictures) p.close();
      return;
    }
    const canvas = el.querySelector("canvas")!;
    canvas.width = replay.width;
    canvas.height = replay.height;
    const ctx = canvas.getContext("2d")!;
    const play = el.querySelector<HTMLButtonElement>(".replay-play")!;
    const track = el.querySelector<HTMLElement>(".replay-track")!;
    const done = el.querySelector<HTMLElement>(".replay-done")!;
    const count = pictures.length;
    el.querySelector<HTMLElement>(".replay-mark")!.style.left = `${(replay.diedAt / Math.max(1, count - 1)) * 100}%`;
    // It holds on the last picture a moment before it starts over.
    const hold = Math.round(replay.fps * 1.2);
    let at = 0;
    let playing = true;
    let last = performance.now();
    let owed = 0;
    const show = () => {
      const i = Math.min(count - 1, at);
      ctx.drawImage(pictures[i], 0, 0);
      const share = (i / Math.max(1, count - 1)) * 100;
      done.style.width = `${share}%`;
      track.setAttribute("aria-valuenow", String(Math.round(share)));
    };
    const tick = (now: number) => {
      if (stopped) return;
      raf = requestAnimationFrame(tick);
      if (playing) {
        owed += now - last;
        const step = 1000 / replay.fps;
        while (owed >= step) {
          owed -= step;
          at = (at + 1) % (count + hold);
        }
        show();
      }
      last = now;
    };
    const setPlaying = (on: boolean) => {
      playing = on;
      play.textContent = on ? "❚❚" : "▶";
      play.setAttribute("aria-label", on ? "Pause" : "Play");
    };
    play.addEventListener("click", () => setPlaying(!playing));
    const seek = (share: number) => {
      at = Math.round(Math.max(0, Math.min(1, share)) * (count - 1));
      owed = 0;
      show();
    };
    track.addEventListener("pointerdown", (e) => {
      const box = track.getBoundingClientRect();
      seek((e.clientX - box.left) / box.width);
    });
    track.addEventListener("keydown", (e) => {
      const by = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (!by) return;
      e.preventDefault();
      setPlaying(false);
      at = Math.max(0, Math.min(count - 1, Math.min(count - 1, at) + by));
      show();
    });
    show();
    raf = requestAnimationFrame(tick);
  };
  document.addEventListener(REPLAYS_EVENT, () => {
    if (!deathsPanel.hidden) renderDeaths();
  });
  const refreshBadge = () => {
    const n = deathsPanel.hidden ? unseen() : 0;
    deathsBadge.hidden = !n;
    deathsBadge.textContent = n > 99 ? "99+" : String(n);
    deathsToggle.setAttribute("aria-label", n ? `Deaths (${n} new)` : "Deaths");
    if (n > badgeWas) {
      deathsToggle.removeAttribute("data-new");
      void deathsToggle.offsetWidth;
      deathsToggle.setAttribute("data-new", "");
    }
    badgeWas = n;
  };
  deathsToggle.addEventListener("animationend", () => deathsToggle.removeAttribute("data-new"));
  const showDeaths = (open: boolean) => {
    if (open === !deathsPanel.hidden) return;
    deathsPanel.hidden = !open;
    if (!open) closeReplay();
    deathsToggle.setAttribute("aria-expanded", String(open));
    if (open) {
      showSettings(false);
      fresh = unseen();
      renderDeaths();
      markSeen();
    }
    refreshBadge();
  };
  deathsToggle.addEventListener("click", () => showDeaths(deathsPanel.hidden));
  deathsBox.querySelector("[data-deaths-close]")!.addEventListener("click", () => {
    showDeaths(false);
    deathsToggle.focus();
  });
  // Clearing the log takes a second press, in case.
  let clearing = 0;
  clearButton.addEventListener("click", () => {
    if (!clearing) {
      clearButton.textContent = "Clear all?";
      clearing = window.setTimeout(() => {
        clearing = 0;
        clearButton.textContent = "Clear";
      }, 3000);
      return;
    }
    window.clearTimeout(clearing);
    clearing = 0;
    clearButton.textContent = "Clear";
    clearLog();
  });
  document.addEventListener(DEATHS_EVENT, () => {
    if (!deathsPanel.hidden) {
      // Someone died while you were looking: it's new, and seen.
      const n = unseen();
      if (n) {
        fresh += n;
        markSeen();
        return;
      }
      renderDeaths();
    }
    refreshBadge();
  });
  refreshBadge();

  // Clicking away or pressing Escape closes the popovers.
  document.addEventListener("pointerdown", (e) => {
    const target = e.target as Node;
    if (!settingsPanel.hidden && !settingsPanel.contains(target) && !settingsToggle.contains(target)) showSettings(false);
    if (!deathsPanel.hidden && !deathsBox.contains(target)) showDeaths(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!settingsPanel.hidden) {
      showSettings(false);
      settingsToggle.focus();
    } else if (!deathsPanel.hidden) {
      showDeaths(false);
      deathsToggle.focus();
    }
  });

  // ── Keeping it all up to date ─────────────────────────────────────────────
  const refresh = () => {
    const m = dressing();
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
    const lockColours = coloursLocked(m);
    for (const tile of $$<HTMLButtonElement>("[data-skin], [data-pattern], [data-thread]")) {
      tile.setAttribute("aria-disabled", String(lockColours));
    }
    const lockNote = wardrobe.querySelector<HTMLElement>("[data-colour-lock]")!;
    const testingNote = !!m?.parent && den.genetics.enabled && world.tuning;
    lockNote.hidden = !lockColours && !testingNote;
    if (m && lockColours) {
      lockNote.innerHTML = `<strong>${escape(nameOf(m))} was born ${escape(colourWords(m))}.</strong> Colours are in the genes, so they can't be changed: its babies take after it (and now and then turn up a colour of their own).`;
    } else if (m && testingNote) {
      lockNote.innerHTML = `<strong>Testing:</strong> colours are in the genes, but with ?tune you can change them. ${escape(nameOf(m))}'s babies will take after whatever you pick.`;
    }
    for (const tile of $$<HTMLButtonElement>("[data-skin]")) tile.setAttribute("aria-pressed", String(trying.skin === tile.dataset.skin));
    for (const tile of $$<HTMLButtonElement>("[data-pattern]")) {
      tile.setAttribute("aria-pressed", String(trying.pattern === tile.dataset.pattern));
    }
    for (const chip of $$<HTMLButtonElement>("[data-thread]")) chip.setAttribute("aria-pressed", String(trying.thread === chip.dataset.thread));

    for (const el of document.querySelectorAll("[data-den-name]")) el.textContent = nameOfTrying();
    nameInput.disabled = !m;
    if (document.activeElement !== nameInput) nameInput.value = m ? trying.name : "";
    for (const button of $$<HTMLButtonElement>("[data-den-surprise], [data-den-undress]")) button.disabled = !m;
    wardrobe.toggleAttribute("data-nobody", !m);
    const lede = document.querySelector("[data-den-lede]");
    if (lede && m) {
      lede.textContent = m.main
        ? "Your main spider: the one on our logo, and in the header. Give it a hat, pick its colours, feed it a snack. Whatever it wears here, it wears all over the site."
        : `${nameOfTrying()} lives in the den. Dress it up however you like, or make it your main spider to wear its look all over the site.`;
    }
    // The big spider is as big as the picked one's grown.
    slotEl?.style.setProperty("--grow", String(Math.min(1.3, 0.45 + 0.55 * (m ? sizeOf(m) : 1))));

    const eaten = snacks();
    wardrobe.querySelector("[data-den-snack-count]")!.textContent = String(eaten);
    wardrobe.querySelector("[data-den-snack-word]")!.textContent = eaten === 1 ? "snack" : "snacks";
    for (const row of $$<HTMLElement>("[data-progress-item]")) {
      const count = Number(row.dataset.count);
      const done = Math.min(count, eaten);
      row.querySelector<HTMLElement>(".progress-bar span")!.style.setProperty("--done", `${(done / count) * 100}%`);
      row.querySelector(".progress-count")!.textContent = done >= count ? "Unlocked" : `${done} / ${count}`;
    }
    refreshPicker();
    refreshCard();
    drawTiles();
  };

  // Whenever the look or the spiders change (here, as it's saved, or in another tab), or the colour
  // scheme flips (pictures have a dark-mode outline).
  document.addEventListener(LOOK_EVENT, refresh);
  document.addEventListener(COLONY_EVENT, refresh);
  dark.addEventListener("change", () => {
    pickerKey = portraitKey = "";
    refresh();
  });
  let resized = 0;
  window.addEventListener("resize", () => {
    cancelAnimationFrame(resized);
    resized = requestAnimationFrame(drawTiles);
  });
  // Hunger and growing up tick along: keep the card and picker current, and how long ago deaths were.
  window.setInterval(() => {
    if (view === "den") {
      refreshCard();
      refreshPicker();
    }
    if (!deathsPanel.hidden) for (const when of deathsList.querySelectorAll<HTMLElement>(".death-when")) when.textContent = ago(Number(when.dataset.at));
    if (!settingsPanel.hidden) refreshClock();
  }, 1000);

  let saved: string | null = null;
  let drawer: string | null = null;
  try {
    saved = localStorage.getItem(VIEW_KEY);
    drawer = localStorage.getItem(DRAWER_KEY);
  } catch {
    // ignore
  }
  // The den starts with the wardrobe tucked away, so you can see everyone.
  setDrawer(drawer === "open", false);
  showView(saved === "den" || location.hash === "#den" ? "den" : "dress", false);
}

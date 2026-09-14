import {
  COLONY_EVENT,
  byId,
  canLay,
  dressMain,
  dressSpider,
  dressing,
  feed,
  grownUp,
  makeMain,
  members,
  nameOf,
  picked,
  pickSpider,
  sizeOf,
  wear,
  type Member,
} from "./den/colony";
import { den, groups as denGroups, schema as denSchema } from "./den/config";
import type { SceneId } from "./den/scenes";
import { createWorld } from "./den/world";
import { config } from "./spider-string/config";
import { getFigure } from "./spider-string/figure";
import { drawSnack, type Snack } from "./spider-string/food";
import { LOOK_EVENT, ateSnack, isUnlocked, setLook, snacks, trying } from "./spider-string/look";
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
 * With ?tune, the den's own tuning panel (den/config.ts). The spider's own settings are tuned on the
 * home page.
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

  /** Nobody's picked in the den, so a click has nobody to dress. */
  const nobody = () => say("<strong>Drag it onto a spider</strong> to dress it up, or pick a spider first.");

  /** A tile clicked: dresses the spider being dressed. */
  const apply = (tile: HTMLElement) => {
    const m = dressing();
    if (!m) return nobody();
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
    trying.skin = Math.random() < 0.5 ? "ink" : pick(Object.keys(SKINS) as Look["skin"][]);
    trying.pattern = Math.random() < 0.7 ? "none" : pick(Object.keys(PATTERNS) as Look["pattern"][]);
    trying.thread = Math.random() < 0.7 ? "silk" : pick(Object.keys(THREADS) as Look["thread"][]);
    wear();
    say(`Ta-da. ${escape(nameOfTrying())} has never looked better.`);
    playFor("faceExcited");
  });
  wardrobe.querySelector("[data-den-undress]")?.addEventListener("click", () => {
    if (!dressing()) return say("Pick a spider to undress.");
    setLook(trying, { ...blankLook(), name: trying.name, skin: trying.skin, pattern: trying.pattern });
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
    if (e.key === "Escape" && view === "den" && picked() && !typing) pickSpider(null);
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

  let portraitKey = "";
  const refreshCard = () => {
    const m = picked();
    card.hidden = !m;
    if (!m) return;
    $card("[data-card-name]").textContent = nameOf(m);
    $card("[data-card-main]").hidden = !m.main;
    $card("[data-card-make-main]").hidden = m.main;
    const stage = grownUp(m) ? "Grown up" : m.growth < 0.35 ? "Baby" : "Growing up";
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
  // Hunger and growing up tick along: keep the card and picker current.
  window.setInterval(() => {
    if (view === "den") {
      refreshCard();
      refreshPicker();
    }
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

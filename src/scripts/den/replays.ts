import { den } from "./config";

/**
 * Death replays for the Spider Den's log: a little film of the last few seconds before a spider
 * died, and a moment after.
 *
 * Filming every spider all the time would be a lot of pictures, so the den only films spiders in
 * danger (world.ts says which): something hunting it, a fight, or about to starve or die of old age.
 * While one is, a camera follows it, keeping the last few seconds as small pictures of the den's
 * canvas around it. If it dies, the camera keeps rolling a moment longer, and the film is saved in
 * this browser (IndexedDB, with a list of what's saved in localStorage) under its death. If the
 * danger passes, the film's thrown away.
 */

type Vec = [number, number];

export const REPLAYS_EVENT = "den:replays";

export interface Replay {
  id: string;
  fps: number;
  width: number;
  height: number;
  /** The frame it died on. */
  diedAt: number;
  frames: Blob[];
}

interface Frame {
  blob: Blob | null;
  done: Promise<void>;
}

interface Film {
  id: string;
  frames: Frame[];
  cam: Vec | null;
  /** Real time (ms) the danger's over, while it's still alive. */
  until: number;
  /** Real time (ms) it died, and the frame it died on. */
  died: number | null;
  diedAt: number;
  /** How long to keep filming after it died, ms. */
  after: number;
  /** Something's got hold of it: keep everything from here back, not just the last few seconds. */
  held: boolean;
  last: number;
  canvas: HTMLCanvasElement;
}

/** Height of a film, next to its width. */
const ASPECT = 0.7;

let pictureType: string | null = null;
/** WebP where the browser can make it (small), JPEG otherwise. */
const typeOfPictures = () => {
  if (pictureType) return pictureType;
  try {
    const probe = document.createElement("canvas");
    probe.width = probe.height = 1;
    pictureType = probe.toDataURL("image/webp").startsWith("data:image/webp") ? "image/webp" : "image/jpeg";
  } catch {
    pictureType = "image/jpeg";
  }
  return pictureType;
};

// ── Filming ──────────────────────────────────────────────────────────────────

export function createReplays() {
  const films = new Map<string, Film>();

  const finish = async (film: Film) => {
    films.delete(film.id);
    await Promise.all(film.frames.map((f) => f.done));
    const frames = film.frames.map((f) => f.blob).filter((b): b is Blob => !!b);
    if (frames.length < 4) return;
    await save({
      id: film.id,
      fps: den.replays.fps,
      width: film.canvas.width,
      height: film.canvas.height,
      diedAt: Math.min(frames.length - 1, film.diedAt),
      frames,
    });
  };

  return {
    /** Spider `id` is in danger: film it (if there's room) for at least the next `seconds`. */
    watch(id: string, seconds = 3) {
      const r = den.replays;
      if (!r.enabled) return;
      const now = performance.now();
      let film = films.get(id);
      if (!film) {
        if (films.size >= r.most) return;
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(r.pixels);
        canvas.height = Math.round(r.pixels * ASPECT);
        film = { id, frames: [], cam: null, until: 0, died: null, diedAt: 0, after: 0, held: false, last: 0, canvas };
        films.set(id, film);
      }
      if (film.died === null) film.until = Math.max(film.until, now + seconds * 1000);
    },

    /** It died: film a moment more (`after` seconds, or the usual), then save it. */
    died(id: string, after = den.replays.after) {
      const film = films.get(id);
      if (!film || film.died !== null) return;
      film.died = performance.now();
      film.diedAt = film.frames.length;
      film.after = after * 1000;
    },

    /** Something's caught it (a bird, a frog): the film keeps the moment it happened, however long it's carried. */
    hold(id: string) {
      const film = films.get(id);
      if (film) film.held = true;
    },

    get filming() {
      return films.size;
    },

    /**
     * After the den's drawn: a picture for each film that's due one, of `source` (the den's canvas,
     * `dpr` device px to a den px) around where its spider is (`where`, den px, or null once it's gone),
     * on `background`.
     */
    capture(source: HTMLCanvasElement, dpr: number, unit: number, where: (id: string) => Vec | null, background: string) {
      if (!films.size) return;
      const r = den.replays;
      const now = performance.now();
      for (const film of [...films.values()]) {
        if (film.died === null && now > film.until) {
          films.delete(film.id);
          continue;
        }
        if (film.died !== null && now - film.died > film.after) {
          void finish(film);
          continue;
        }
        if (now - film.last < 1000 / Math.max(1, r.fps) - 4) continue;
        film.last = now;
        const at = where(film.id);
        if (at) film.cam = film.cam ? [film.cam[0] + (at[0] - film.cam[0]) * 0.45, film.cam[1] + (at[1] - film.cam[1]) * 0.45] : at;
        if (!film.cam) continue;
        const sw = Math.min(source.width, r.width * unit * dpr);
        const sh = Math.min(source.height, sw * ASPECT);
        const sx = Math.max(0, Math.min(source.width - sw, film.cam[0] * dpr - sw / 2));
        const sy = Math.max(0, Math.min(source.height - sh, film.cam[1] * dpr - sh / 2));
        const { canvas } = film;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(source, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
        // The picture's taken now; it's made into an image file in the background.
        const frame = { blob: null } as Frame;
        frame.done = new Promise<void>((resolve) =>
          canvas.toBlob(
            (blob) => {
              frame.blob = blob;
              resolve();
            },
            typeOfPictures(),
            0.78,
          ),
        );
        film.frames.push(frame);
        const most = (film.died !== null || film.held ? r.before + 10 : r.before) * r.fps;
        if (film.frames.length > most) film.frames.shift();
      }
    },

    /** The den's stopped: films of spiders that already died are saved as they are; the rest are dropped. */
    stop() {
      for (const film of [...films.values()]) {
        if (film.died !== null) void finish(film);
        else films.delete(film.id);
      }
    },
  };
}

export type Replays = ReturnType<typeof createReplays>;

// ── Keeping them ─────────────────────────────────────────────────────────────

const LIST_KEY = "den:replays";
const DB_NAME = "spider-den";
const STORE = "replays";

function readList(): string[] {
  try {
    const list = JSON.parse(localStorage.getItem(LIST_KEY) ?? "[]");
    return Array.isArray(list) ? list.map(String) : [];
  } catch {
    return [];
  }
}
/** The ids with a replay saved, newest last. */
let list = readList();
const storeList = () => {
  try {
    localStorage.setItem(LIST_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
  document.dispatchEvent(new CustomEvent(REPLAYS_EVENT));
};
window.addEventListener("storage", (e) => {
  if (e.key !== LIST_KEY) return;
  list = readList();
  document.dispatchEvent(new CustomEvent(REPLAYS_EVENT));
});

let opening: Promise<IDBDatabase | null> | null = null;
const database = () =>
  (opening ??= new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  }));

async function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  const db = await database();
  if (!db) return null;
  try {
    const req = work(db.transaction(STORE, mode).objectStore(STORE));
    return await new Promise<T | null>((resolve) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function save(replay: Replay) {
  const done = await run("readwrite", (store) => store.put(replay));
  if (done === null) return;
  list = [...list.filter((id) => id !== replay.id), replay.id];
  const most = Math.max(1, Math.round(den.replays.keep));
  const extra = list.slice(0, Math.max(0, list.length - most));
  list = list.slice(extra.length);
  for (const id of extra) void run("readwrite", (store) => store.delete(id));
  storeList();
}

/** Whether there's a replay of spider `id`'s death. */
export const hasReplay = (id: string) => list.includes(id);

export const loadReplay = (id: string) => run<Replay | undefined>("readonly", (store) => store.get(id));

/** Forgets every replay except those of `ids` (all of them, with none given). */
export function forgetReplays(ids: Set<string> = new Set()) {
  const gone = list.filter((id) => !ids.has(id));
  if (!gone.length) return;
  list = list.filter((id) => ids.has(id));
  for (const id of gone) void run("readwrite", (store) => store.delete(id));
  storeList();
}

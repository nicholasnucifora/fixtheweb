import { config } from "./config";

/** Where the string attaches this frame, in document pixels. */
export interface AnchorFrame {
  x: number;
  y: number;
  /** Rendered height of the anchor glyph in px: the size everything else is scaled by. */
  unit: number;
  /**
   * For a spider kept in a slot: how far below the anchor the middle of the spider should hang, px.
   * The string is as long as that takes, rather than Strings → Length.
   */
  hangTo?: number;
}

/**
 * A spider sitting in a slot on the page (the header's logo) rather than hanging from a glyph: it
 * hangs on a thread from the top of the window, sized to the slot's width and as low as its middle.
 * The slot is measured every frame, so it can be fixed in place while the page scrolls under it.
 */
export function createSlotAnchor(slot: HTMLElement) {
  return {
    measure(): AnchorFrame | null {
      const r = slot.getBoundingClientRect();
      if (!r.width || !r.height) return null;
      // Just above the top of the window, so the thread runs off it.
      const top = -2;
      return {
        x: r.left + r.width / 2 + window.scrollX,
        y: top + window.scrollY,
        unit: r.width / Math.max(0.1, config.look.width),
        hangTo: r.top + r.height / 2 - top,
      };
    },
  };
}

/**
 * Tracks the lowest point of an SVG glyph on the page.
 *
 * The point is found once in the glyph's own coordinate space (so it survives
 * any edits to the path), then mapped through the element's current transform
 * every frame, which covers the logo moving, resizing, or animating.
 */
export function createAnchor(glyph: SVGGraphicsElement) {
  const box = glyph.getBBox();
  const local = lowestPoint(glyph, box);

  return {
    measure(): AnchorFrame | null {
      const m = glyph.getScreenCTM();
      if (!m) return null;
      const unit = box.height * Math.hypot(m.a, m.b);
      if (!unit) return null;
      return {
        x: m.a * local.x + m.c * local.y + m.e + window.scrollX + config.anchor.offsetX * unit,
        y: m.b * local.x + m.d * local.y + m.f + window.scrollY + config.anchor.offsetY * unit,
        unit,
      };
    },
  };
}

/** Samples the outline for its maximum y. A flat bottom resolves to its middle. */
function lowestPoint(glyph: SVGGraphicsElement, box: DOMRect) {
  if (!(glyph instanceof SVGGeometryElement)) {
    return { x: box.x + box.width / 2, y: box.y + box.height };
  }

  const total = glyph.getTotalLength();
  const samples = 600;
  const points: DOMPoint[] = [];
  let maxY = -Infinity;
  for (let i = 0; i <= samples; i++) {
    const p = glyph.getPointAtLength((total * i) / samples);
    points.push(p);
    maxY = Math.max(maxY, p.y);
  }

  const bottom = points.filter((p) => p.y >= maxY - box.height * 0.002);
  const x = bottom.reduce((sum, p) => sum + p.x, 0) / bottom.length;
  return { x, y: maxY };
}

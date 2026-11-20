import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { dev, preview } from "astro";

const root = fileURLToPath(new URL("../", import.meta.url));
const server = { host: "127.0.0.1", port: 0 };
const get = (port, route) => fetch(`http://127.0.0.1:${port}${route}`);
const developmentRoutes = [
  "/den", "/life", "/design", "/old-pages", "/old-pages/den", "/old-pages/life",
  "/work/villow", "/notes/design-and-access",
  "/ideas", "/about",
];
const removedRoutes = ["/notes/digital-duty-of-care"];

test("production contains only the coming-soon screen and refuses development routes", async () => {
  const nodeEnv = process.env.NODE_ENV;
  const directory = await mkdtemp(path.join(os.tmpdir(), "fixtheweb-public-"));
  let production;
  try {
    await promisify(execFile)(process.execPath, [
      path.join(root, "node_modules/astro/bin/astro.mjs"), "build", "--outDir", directory, "--silent",
    ], { cwd: root, env: { ...process.env, NODE_ENV: "production" }, timeout: 30000, windowsHide: true });
    production = await preview({ root, outDir: directory, server, logLevel: "silent" });
    for (const route of ["/", "/?tune&unlock-all&preview=1", "/?preset=a", "/?preset=b", "/?preset=c", "/?preset=c2", "/?preset=c3", "/?preset=c4", "/?preset=c5", "/?preset=d", "/?preset=e"]) {
      const response = await get(production.port, route);
      assert.equal(response.status, 200);
      const html = await response.text();
      assert.match(html, /<title>Fix the Web · Coming soon<\/title>/);
      assert.match(html, /data-coming-soon="true"/);
      assert.match(html, /Coming soon\./);
      assert.match(html, /data-spider-string/);
      assert.match(html, /<canvas\b/);
      assert.equal((html.match(/data-spider-string/g) ?? []).length, 1);
      assert.doesNotMatch(html, /<header\b|<nav\b|<a\b|class="section\b|TBD|Villow|Your life on screens|To be decided|preset-bar|page-preset/i);
    }
    for (const route of [...developmentRoutes, ...removedRoutes].flatMap(route => [route, `${route}/`, `${route}/index.html`, `${route}?preview=1&tune`, `${route}?preset=c`, `${route}?preset=c2`, `${route}?preset=c3`, `${route}?preset=c4`, `${route}?preset=c5`, `${route}?preset=d`, `${route}?preset=e`])) {
      assert.equal((await get(production.port, route)).status, 404, route);
    }
    assert.ok(!(await readdir(directory)).some(name => ["den", "life", "design", "old-pages", "work", "notes", "ideas", "about"].includes(name)));
    const assets = await readdir(path.join(directory, "_astro"));
    assert.ok(assets.some(name => name.startsWith("SpiderString.") && name.endsWith(".js")));
    assert.ok(!assets.some(name => /villow|Header\.|den\.astro|life\.astro|design\.astro|DevelopmentHero|Fredoka|Nunito|tune|PresetSwitch|PreviewState|proposals/i.test(name)));
    // Scroll lock is part of the shipped page, including with JavaScript disabled.
    assert.match(await readFile(path.join(directory, "index.html"), "utf8"), /html\[data-coming-soon\][^{]*\{[^}]*overflow:hidden/);
  } finally {
    await production?.stop();
    if (nodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = nodeEnv;
    assert.equal(path.dirname(directory), path.resolve(os.tmpdir()));
    assert.ok(path.basename(directory).startsWith("fixtheweb-public-"));
    await rm(directory, { recursive: true });
  }
});

test("development serves the new direction and keeps earlier experiments in Old pages", async () => {
  const development = await dev({ root, server, devToolbar: { enabled: false }, logLevel: "silent" });
  try {
    const home = await get(development.address.port, "/?tune");
    assert.equal(home.status, 200);
    const html = await home.text();
    assert.match(html, /<header\b/);
    assert.match(html, /Villow/);
    assert.match(html, /href="\/work\/villow/);
    assert.doesNotMatch(html, /To be decided/);
    assert.doesNotMatch(html, /<html[^>]*\bdata-coming-soon/);
    for (const route of developmentRoutes) {
      const response = await get(development.address.port, route);
      assert.equal(response.status, 200, route);
      assert.match(await response.text(), /<main\b/);
    }
    for (const route of removedRoutes.flatMap(route => [route, `${route}/`, `${route}?preset=a`, `${route}?preset=b`])) {
      assert.equal((await get(development.address.port, route)).status, 404, route);
    }
    // Every comparison has independently addressable, meaningfully different pages.
    const comparisons = [
      ["/", "There’s a lot worth", "We shouldn’t have to give up"],
      ["/work/villow", "What if there were a natural place to stop?", "Our blueprint for"],
      ["/notes/design-and-access", "Better designs need", "Let people build"],
      ["/ideas", "Explore the proposal and trade-offs", "What needs working through"],
      ["/about", "Read the full message", "I’ve spent months iterating on Villow"],
    ];
    const rendered = new Map();
    for (const [route, aText, bText] of comparisons) {
      const a = await (await get(development.address.port, `${route}?preset=a`)).text();
      const b = await (await get(development.address.port, `${route}?preset=b`)).text();
      assert.ok(a.includes(aText), `${route} A retains its content`);
      assert.ok(b.includes(bText), `${route} B contains its revision`);
      assert.notEqual(a, b, `${route} has distinct presets`);
      assert.match(a, /data-preset="a"/);
      assert.match(b, /data-preset="b"/);
      assert.match(a, /Preset A/);
      assert.match(b, /Preset B/);
      assert.doesNotMatch(a, /digital[ -]duty[ -]of[ -]care/i);
      assert.doesNotMatch(b, /digital[ -]duty[ -]of[ -]care/i);
      const defaultPage = await (await get(development.address.port, route)).text();
      assert.match(defaultPage, /data-preset="b"/);
      rendered.set(`${route}?preset=a`, a);
      rendered.set(`${route}?preset=b`, b);
      const cResponse = await get(development.address.port, `${route}?preset=c`);
      assert.equal(cResponse.status, 200);
      const c = await cResponse.text();
      if (route === "/work/villow") {
        assert.match(c, /data-preset="c"/);
        assert.match(c, /data-preview-preset="c"/);
        assert.match(c, /aria-label="Preset C"/);
        assert.match(c, /principles-glance/);
        assert.match(c, /Make reflection useful\./);
        assert.match(c, /to-do list or an activity to try offline/);
        assert.equal((c.match(/class="visual-chapter(?: [^"]*)?"/g) ?? []).length, 6);
        assert.doesNotMatch(c, /data-reflection-demo|data-watch-free-days/);
        assert.doesNotMatch(c, /Daily use|Try it yourself|Pause animation|data-manual-form|role="tablist"/);
        assert.match(c, /Future direction/);
        assert.doesNotMatch(c, /Read more|class="project-connection"/);
        assert.match(c, /<ul\b/);
        assert.match(c, /the hope of a great next clip/);
        assert.doesNotMatch(c, /<span class="bait bait-find"/);
        assert.match(b, /<span class="bait bait-find"/);
        assert.match(b, /A run of forgettable clips/);
        for (const id of ["design-goals", "value", "finite-feeds", "intentions", "motivation", "reflection", "subscriptions", "connection", "information", "access", "adoption", "learning", "principle-theme-0", "principle-theme-3"]) {
          assert.ok(b.includes(`id="${id}"`) && c.includes(`id="${id}"`), `B/C share ${id} for comparison`);
        }
        rendered.set(`${route}?preset=c`, c);
        // C2 keeps C's layout and anchors, with principle-level copy and no feature detail.
        const c2Response = await get(development.address.port, `${route}?preset=c2`);
        assert.equal(c2Response.status, 200);
        const c2 = await c2Response.text();
        assert.match(c2, /data-preset="c2"/);
        assert.match(c2, /aria-label="Preset C2"/);
        assert.match(c2, /principles-glance/);
        assert.equal((c2.match(/class="visual-chapter(?: [^"]*)?"/g) ?? []).length, 6);
        assert.match(c2, /These are the ideas, not a feature list\./);
        assert.match(c2, /href="https:\/\/doi\.org\/10\.1037\/h0088188"/);
        assert.match(c2, /Villow doesn’t tackle this yet/);
        assert.doesNotMatch(c2, /Future direction/);
        assert.doesNotMatch(c2, /to-do list or an activity to try offline/);
        assert.notEqual(c, c2);
        for (const id of ["design-goals", "design-questions", "value", "finite-feeds", "intentions", "motivation", "reflection", "subscriptions", "connection", "information", "access", "adoption", "learning", "beyond-the-feed", "principle-theme-0", "principle-theme-1", "principle-theme-2", "principle-theme-3"]) {
          assert.ok(c.includes(`id="${id}"`) && c2.includes(`id="${id}"`), `C/C2 share ${id} for comparison`);
        }
        rendered.set(`${route}?preset=c2`, c2);
        // C3 uses why-first bullets; C4 rewords C3 and C5 tightens C4, bullet for bullet. All cite 02 with a [1] footnote.
        for (const preset of ["c3", "c4", "c5"]) {
          const response = await get(development.address.port, `${route}?preset=${preset}`);
          assert.equal(response.status, 200);
          const html = await response.text();
          assert.ok(html.includes(`data-preset="${preset}"`));
          assert.ok(html.includes(`aria-label="Preset ${preset.toUpperCase()}"`));
          assert.equal((html.match(/class="visual-chapter(?: [^"]*)?"/g) ?? []).length, 6);
          assert.match(html, /These are the ideas, not a feature list\./);
          assert.match(html, /href="https:\/\/doi\.org\/10\.1037\/h0088188"/);
          assert.doesNotMatch(html, /Future direction/);
          assert.match(html, /Change what the system rewards\./);
          assert.doesNotMatch(html, /data-point-style="prose"|class="principle-lead"/);
          assert.equal((html.match(/data-footnote/g) ?? []).length, 1);
          assert.match(html, /<span class="footnote-keep"[^>]*>themselves\.<span class="footnote" data-footnote[^>]*><button type="button" class="footnote-ref[^"]*" aria-expanded="false" aria-controls="principle-note-1"[^>]*>\[1\]<\/button>/);
          assert.match(html, /href="https:\/\/doi\.org\/10\.1080\/17437199\.2020\.1718529"/);
          assert.match(html, /A meta-analysis of 73 health studies\./);
          assert.doesNotMatch(html, /\(Aronson|class="point-sources"/);
          assert.equal(html.includes("Fight disinformation."), preset !== "c3");
          assert.equal(html.includes("Fight misinformation."), preset === "c3");
          assert.equal(html.includes("Every other improvement depends on trust"), preset === "c3");
          assert.equal(html.includes("like autoplay and endless scrolling"), preset === "c4");
          assert.equal(html.includes("with each person shaping it for themselves"), preset === "c5");
          for (const id of ["design-goals", "design-questions", "value", "finite-feeds", "intentions", "motivation", "reflection", "subscriptions", "connection", "information", "access", "adoption", "learning", "beyond-the-feed", "principle-theme-0", "principle-theme-1", "principle-theme-2", "principle-theme-3"]) {
            assert.ok(html.includes(`id="${id}"`), `${preset} shares ${id} for comparison`);
          }
          rendered.set(`${route}?preset=${preset}`, html);
        }
      } else {
        assert.match(c, /data-preset="b"/);
        assert.ok(c.includes(bText), `${route} falls back to B for unsupported C`);
        assert.doesNotMatch(c, /data-preset-choice="c"/);
        assert.doesNotMatch(b, /data-preset-choice="c"/);
        const c2 = await (await get(development.address.port, `${route}?preset=c2`)).text();
        assert.match(c2, /data-preset="b"/);
        assert.doesNotMatch(b, /data-preset-choice="c2"/);
        for (const preset of ["c3", "c4", "c5"]) assert.match(await (await get(development.address.port, `${route}?preset=${preset}`)).text(), /data-preset="b"/);
      }
      for (const preset of ["d", "e"]) {
        const response = await get(development.address.port, `${route}?preset=${preset}`);
        assert.equal(response.status, 200);
        const visual = await response.text();
        if (route === "/work/villow") {
          assert.ok(visual.includes(`data-preset="${preset}"`));
          assert.match(visual, /Know where your time goes and whether it feels well spent/);
          assert.doesNotMatch(visual, /Put reflection at the centre/);
          assert.equal((visual.match(/class="visual-chapter(?: [^"]*)?"/g) ?? []).length, 6);
          assert.doesNotMatch(visual, /data-reflection-demo/);
          for (const id of ["value", "finite-feeds", "intentions", "motivation", "reflection", "subscriptions", "connection", "information", "access", "adoption", "learning", "principle-theme-0", "principle-theme-3"]) {
            assert.ok(visual.includes(`id="${id}"`), `${preset} retains ${id}`);
          }
          for (const retained of ["not a health benchmark", "remain proposals to develop and test", "Villow has not established reductions"]) assert.ok(visual.includes(retained), `${preset} retains content: ${retained}`);
          assert.ok(visual.includes(`data-principles-layout="${preset === "d" ? "rows" : "tiles"}"`));
          assert.doesNotMatch(visual, /data-story-option="/);
          assert.doesNotMatch(visual, /Read more|class="principle-detail"/);
          // Core ideas and cross-preset anchors remain visible without JS or disclosures.
          const withoutDetails = visual.replace(/<details\b[\s\S]*?<\/details>/g, "");
          for (const id of ["value", "finite-feeds", "intentions", "motivation", "reflection", "subscriptions", "connection", "information"]) {
            assert.ok(withoutDetails.includes(`id="${id}"`), `${preset} shows ${id} outside disclosures`);
          }
          rendered.set(`${route}?preset=${preset}`, visual);
        } else {
          assert.match(visual, /data-preset="b"/);
          assert.ok(visual.includes(bText));
          assert.ok(!visual.includes(`data-preset-choice="${preset}"`));
        }
      }
    }
    // Mixed presets must not strand visitors on missing section anchors.
    for (const [address, html] of rendered) {
      // The incentives business-model note and research disclosure were removed from every preset.
      assert.doesNotMatch(html, /Personal control is a start|Why focus on incentives|PMC8256037|PMC8363141/, address);
      for (const match of html.matchAll(/<a\b[^>]*\bhref="([^"]+)"[^>]*>/g)) {
        if (/\bdownload\b/.test(match[0])) continue;
        const url = new URL(match[1].replaceAll("&amp;", "&"), `http://preview.local${address}`);
        if (url.origin !== "http://preview.local" || !url.hash) continue;
        const targetPath = url.pathname.replace(/\/$/, "") || "/";
        if (!comparisons.some(([route]) => route === targetPath)) continue;
        const presets = url.searchParams.has("preset") ? [url.searchParams.get("preset")] : targetPath === "/work/villow" ? ["a", "b", "c", "c2", "c3", "c4", "c5", "d", "e"] : ["a", "b"];
        for (const preset of presets) {
          const target = rendered.get(`${targetPath}?preset=${preset}`);
          assert.ok(target?.includes(`id="${decodeURIComponent(url.hash.slice(1))}"`), `${address} -> ${targetPath} preset ${preset}${url.hash}`);
        }
      }
    }
    const archive = await (await get(development.address.port, "/old-pages")).text();
    assert.match(archive, /href="\/old-pages\/den"/);
    assert.match(archive, /href="\/old-pages\/life"/);
    for (const route of ["/old-pages/den", "/old-pages/life", "/den", "/life"]) {
      const html = await (await get(development.address.port, route)).text();
      assert.match(html, /Old pages · Fix the Web/);
      assert.match(html, /href="\/old-pages"/);
    }
  } finally {
    await development.stop();
  }
});

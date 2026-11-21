#!/usr/bin/env node
/**
 * Turns dist-standalone/index.html (one file with JS and CSS inlined) into the page fragment that Claude
 * artifacts expect: no <!doctype>, <html>, <head> or <body> tags of its own, title and styles at the top.
 * Output: dist-standalone/artifact.html, published next to dist-standalone/data/.
 */
import { readFile, writeFile } from "node:fs/promises";

const html = await readFile("dist-standalone/index.html", "utf8");
const head = html.match(/<head>([\s\S]*?)<\/head>/i)?.[1] ?? "";
const body = html.match(/<body>([\s\S]*?)<\/body>/i)?.[1] ?? "";
const keepHead = head
  .split(/(?=<)/)
  .join("")
  .replace(/<meta charset[^>]*>/i, "")
  .replace(/<meta name="viewport"[^>]*>/i, "")
  .replace(/<link rel="icon"[^>]*>/i, "");
const title = keepHead.match(/<title>[\s\S]*?<\/title>/i)?.[0] ?? "<title>Wayfarer's Almanac</title>";
const rest = keepHead.replace(title, "");
const out = `${title}\n<meta name="claude:viewport-fit-sides" content="cover">\n${rest.trim()}\n${body.trim()}\n`;
await writeFile("dist-standalone/artifact.html", out);
console.log(`artifact.html ${(out.length / 1024).toFixed(0)} KB`);

import { access, readdir, readFile, stat } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const dist = join(root, "dist");
const htmlFiles = [];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (extname(entry.name) === ".html") htmlFiles.push(path);
  }
}

await access(dist);
await walk(dist);

if (htmlFiles.length < 35) {
  throw new Error(`Expected at least 35 generated HTML pages, found ${htmlFiles.length}`);
}

const failures = [];
for (const htmlFile of htmlFiles) {
  const html = await readFile(htmlFile, "utf8");
  if (/https?:\/\/(?:www\.)?danikalaw\.com\/wp-content\/uploads\//i.test(html)) {
    failures.push(`${relative(dist, htmlFile)} still references Bluehost media`);
  }

  const references = html.matchAll(/(?:src|href)="(\/(?!\/)[^"?#]+)"/g);
  for (const [, reference] of references) {
    if (reference === "/" || reference.startsWith("/mailto:")) continue;
    const target = join(dist, decodeURIComponent(reference));
    const candidates = [target, join(target, "index.html"), `${target}.html`];
    let exists = false;
    for (const candidate of candidates) {
      try {
        const info = await stat(candidate);
        if (info.isFile()) {
          exists = true;
          break;
        }
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
    }
    if (!exists) failures.push(`${relative(dist, htmlFile)} has a broken reference to ${reference}`);
  }
}

if (failures.length) throw new Error(failures.join("\n"));
console.log(`Verified ${htmlFiles.length} HTML pages with no Bluehost media references or broken local links.`);

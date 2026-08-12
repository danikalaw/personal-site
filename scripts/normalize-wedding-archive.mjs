import { createHash } from "node:crypto";
import { access, readFile, readdir, rename, unlink, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../wedding-archive/public/", import.meta.url));

async function ensureArchivedAsset(relativePath) {
  const destination = join(root, relativePath);
  try {
    await access(destination);
    return;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  const source = new URL(relativePath, "https://www.wedding.danikalaw.com/");
  const response = await fetch(source);
  if (!response.ok) throw new Error(`Could not archive ${source}: ${response.status}`);
  await writeFile(destination, Buffer.from(await response.arrayBuffer()));
}

async function walk(directory) {
  const paths = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) paths.push(...(await walk(path)));
    else paths.push(path);
  }
  return paths;
}

function digest(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

await ensureArchivedAsset("wp-includes/js/thickbox/loadingAnimation.gif");

try {
  await unlink(join(root, "robots.txt.html"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

let files = await walk(root);
for (const source of files.filter((path) => path.includes("?"))) {
  const destination = source.slice(0, source.indexOf("?"));
  try {
    const [sourceBytes, destinationBytes] = await Promise.all([readFile(source), readFile(destination)]);
    if (digest(sourceBytes) !== digest(destinationBytes)) {
      throw new Error(`Conflicting archive files would normalize to ${destination}`);
    }
    await unlink(source);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    await rename(source, destination);
  }
}

files = await walk(root);
const textExtensions = new Set([".css", ".html", ".js", ".svg"]);
for (const path of files.filter((file) => textExtensions.has(extname(file)))) {
  const original = await readFile(path, "utf8");
  let normalized = original.replace(/%3F[^'"\s)<>]*/gi, "");

  if (path.endsWith("index.html")) {
    normalized = normalized
      .replace(/https:\/\/www\.wedding\.danikalaw\.com\/(wp-(?:content|includes)\/)/g, "$1")
      .replace(/href=(['"])https:\/\/www\.wedding\.danikalaw\.com\/?\1/g, "href=$1/$1")
      .replace(/action=(['"])https:\/\/www\.wedding\.danikalaw\.com\/#rsvpArea\1/g, "action=$1#rsvpArea$1")
      .replace(/cropped-garrett-danika-heart-1-(?:180x180|270x270)\.png/g, "cropped-garrett-danika-heart-1-192x192.png")
      .replace("html('We're married now!')", 'html("We\'re married now!")')
      .replace(/^.*(?:rel="pingback"|type="(?:application\/rss\+xml|application\/json\+oembed|text\/xml\+oembed)"|rel="https:\/\/api\.w\.org\/").*\n?/gm, "")
      .replace(/<!--\[if lt IE 9\]>[\s\S]*?<!\[endif\]-->/gi, "")
      .replace(/<script id="wp-emoji-settings"[\s\S]*?<\/script>\s*<script type="module">[\s\S]*?<\/script>\s*/i, "");
  }

  if (normalized !== original) await writeFile(path, normalized);
}

console.log(`Normalized ${files.length} archived wedding-site files.`);

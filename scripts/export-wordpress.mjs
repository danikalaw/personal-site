import { mkdir, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const apiRoot = "https://danikalaw.com/wp-json/wp/v2";
const archiveRoot = join(projectRoot, "archive", "wordpress");
const mediaRoot = join(projectRoot, "public", "media");
const dataPath = join(projectRoot, "src", "data", "wordpress.json");

const endpoints = {
  posts: "posts",
  pages: "pages",
  media: "media",
  categories: "categories",
  tags: "tags",
};

async function fetchCollection(endpoint) {
  const response = await fetch(`${apiRoot}/${endpoint}?per_page=100&context=view`);
  if (!response.ok) {
    throw new Error(`WordPress export failed for ${endpoint}: ${response.status} ${response.statusText}`);
  }

  const totalPages = Number(response.headers.get("x-wp-totalpages") ?? "1");
  const items = await response.json();

  for (let page = 2; page <= totalPages; page += 1) {
    const pageResponse = await fetch(`${apiRoot}/${endpoint}?per_page=100&context=view&page=${page}`);
    if (!pageResponse.ok) {
      throw new Error(`WordPress export failed for ${endpoint} page ${page}: ${pageResponse.status} ${pageResponse.statusText}`);
    }
    items.push(...(await pageResponse.json()));
  }

  return items;
}

function decodeEntities(value) {
  const named = {
    amp: "&",
    apos: "'",
    gt: ">",
    hellip: "…",
    laquo: "«",
    ldquo: "“",
    lsquo: "‘",
    lt: "<",
    mdash: "—",
    nbsp: " ",
    ndash: "–",
    quot: '"',
    raquo: "»",
    rdquo: "”",
    rsquo: "’",
  };

  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, code) => {
    if (code[0] === "#") {
      const hex = code[1].toLowerCase() === "x";
      const point = Number.parseInt(code.slice(hex ? 2 : 1), hex ? 16 : 10);
      if (!Number.isFinite(point)) throw new Error(`Invalid HTML entity: ${entity}`);
      return String.fromCodePoint(point);
    }

    const decoded = named[code.toLowerCase()];
    return decoded ?? entity;
  });
}

function plainText(html) {
  return decodeEntities(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function uploadPath(url) {
  const parsed = new URL(url);
  const marker = "/wp-content/uploads/";
  const markerIndex = parsed.pathname.indexOf(marker);
  if (markerIndex === -1) throw new Error(`Media URL is outside WordPress uploads: ${url}`);
  return `/media/${decodeURIComponent(parsed.pathname.slice(markerIndex + marker.length))}`;
}

function addUrlVariants(map, sourceUrl, destinationUrl) {
  const parsed = new URL(sourceUrl);
  const hostnames = new Set([parsed.hostname, parsed.hostname.replace(/^www\./, ""), `www.${parsed.hostname.replace(/^www\./, "")}`]);
  for (const protocol of ["https:", "http:"]) {
    for (const hostname of hostnames) {
      map.set(`${protocol}//${hostname}${parsed.pathname}`, destinationUrl);
    }
  }
}

function buildMediaMaps(media) {
  const byId = new Map();
  const byUrl = new Map();

  for (const item of media) {
    const destination = uploadPath(item.source_url);
    byId.set(item.id, {
      alt: plainText(item.alt_text || item.caption?.rendered || ""),
      height: item.media_details?.height ?? null,
      path: destination,
      width: item.media_details?.width ?? null,
    });
    addUrlVariants(byUrl, item.source_url, destination);

    for (const size of Object.values(item.media_details?.sizes ?? {})) {
      if (size?.source_url) addUrlVariants(byUrl, size.source_url, destination);
    }
  }

  return { byId, byUrl };
}

function rewriteHtml(html, mediaByUrl) {
  const rewritten = html
    .replace(/\s(?:srcset|sizes)=("[^"]*"|'[^']*')/gi, "")
    .replace(/https?:\/\/(?:www\.)?danikalaw\.com\/wp-content\/uploads\/[^\s"'<>]+/gi, (url) => {
      const cleanUrl = url.replace(/&amp;.*$/, "").split("?")[0];
      const mapped = mediaByUrl.get(cleanUrl);
      if (!mapped) throw new Error(`No exported media item matches ${cleanUrl}`);
      return mapped;
    })
    .replace(/https?:\/\/(?:www\.)?danikalaw\.com(?=\/)/gi, "")
    .replace(/\sloading=("lazy"|'lazy')/gi, " loading=\"lazy\"")
    .replace(/\sdecoding=("async"|'async')/gi, " decoding=\"async\"");

  const remainingUploads = rewritten.match(/https?:\/\/[^\s"'<>]+\/wp-content\/uploads\//gi);
  if (remainingUploads) {
    throw new Error(`External WordPress media URLs remain after export: ${remainingUploads.join(", ")}`);
  }

  return rewritten;
}

function terms(ids, lookup) {
  return ids.map((id) => {
    const term = lookup.get(id);
    if (!term) throw new Error(`WordPress term ${id} is missing from the export`);
    return { name: decodeEntities(term.name), slug: term.slug };
  });
}

async function downloadMedia(item) {
  const destination = join(projectRoot, "public", uploadPath(item.source_url));
  await mkdir(dirname(destination), { recursive: true });

  try {
    const existing = await stat(destination);
    if (existing.size > 0) return;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  const response = await fetch(item.source_url);
  if (!response.ok) {
    throw new Error(`Failed to download ${item.source_url}: ${response.status} ${response.statusText}`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length === 0) throw new Error(`Downloaded an empty media file: ${item.source_url}`);
  if (bytes.length > 25 * 1024 * 1024) {
    throw new Error(`Media file exceeds Cloudflare Pages' 25 MiB limit: ${item.source_url}`);
  }
  await writeFile(destination, bytes);
}

async function runWorkers(items, workerCount, action) {
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(workerCount, items.length) }, async () => {
      while (cursor < items.length) {
        const index = cursor;
        cursor += 1;
        await action(items[index]);
      }
    }),
  );
}

await mkdir(archiveRoot, { recursive: true });
await mkdir(mediaRoot, { recursive: true });
await mkdir(dirname(dataPath), { recursive: true });

const exported = Object.fromEntries(
  await Promise.all(Object.entries(endpoints).map(async ([key, endpoint]) => [key, await fetchCollection(endpoint)])),
);

for (const [name, items] of Object.entries(exported)) {
  await writeFile(join(archiveRoot, `${name}.json`), `${JSON.stringify(items, null, 2)}\n`);
}

const categoryById = new Map(exported.categories.map((category) => [category.id, category]));
const tagById = new Map(exported.tags.map((tag) => [tag.id, tag]));
const mediaMaps = buildMediaMaps(exported.media);

const normalizeEntry = (entry, type) => ({
  id: entry.id,
  type,
  slug: entry.slug,
  date: entry.date,
  modified: entry.modified,
  title: decodeEntities(entry.title.rendered),
  excerpt: plainText(entry.excerpt?.rendered ?? ""),
  content: rewriteHtml(entry.content.rendered, mediaMaps.byUrl),
  featuredMedia: entry.featured_media ? mediaMaps.byId.get(entry.featured_media) ?? null : null,
  categories: type === "post" ? terms(entry.categories, categoryById) : [],
  tags: type === "post" ? terms(entry.tags, tagById) : [],
});

const data = {
  posts: exported.posts.map((entry) => normalizeEntry(entry, "post")),
  pages: exported.pages.map((entry) => normalizeEntry(entry, "page")),
};

await writeFile(dataPath, `${JSON.stringify(data, null, 2)}\n`);
await runWorkers(exported.media, 6, downloadMedia);

console.log(`Exported ${data.posts.length} posts, ${data.pages.length} pages, and ${exported.media.length} media files.`);

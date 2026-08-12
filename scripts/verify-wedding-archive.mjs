import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Script } from "node:vm";

const root = resolve(fileURLToPath(new URL("../wedding-archive/public/", import.meta.url)));
const files = [];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else files.push(path);
  }
}

await walk(root);

const failures = [];
const textExtensions = new Set([".css", ".html", ".js", ".svg"]);
const references = [];

for (const file of files) {
  if (file.includes("?")) failures.push(`${relative(root, file)} has a query string in its filename`);
  if (!textExtensions.has(extname(file))) continue;

  const text = await readFile(file, "utf8");
  if (/https?:\/\/(?:www\.)?wedding\.danikalaw\.com/i.test(text)) {
    failures.push(`${relative(root, file)} still depends on the Bluehost wedding origin`);
  }

  if (extname(file) === ".html") {
    let scriptIndex = 0;
    for (const match of text.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)) {
      const [, attributes, source] = match;
      if (/\bsrc=|type=["']application\/json/i.test(attributes) || !source.trim()) continue;
      scriptIndex += 1;
      try {
        new Script(source, { filename: `${relative(root, file)}#inline-script-${scriptIndex}` });
      } catch (error) {
        failures.push(`${relative(root, file)} has invalid inline JavaScript: ${error.message}`);
      }
    }
  }

  if ([".html", ".svg"].includes(extname(file))) {
    for (const match of text.matchAll(/(?:src|href|action)=(['"])(.*?)\1/gi)) {
      references.push({ file, value: match[2] });
    }
    for (const match of text.matchAll(/srcset=(['"])(.*?)\1/gi)) {
      for (const candidate of match[2].split(",")) {
        references.push({ file, value: candidate.trim().split(/\s+/)[0] });
      }
    }
  }
  if ([".css", ".html", ".svg"].includes(extname(file))) {
    for (const match of text.matchAll(/url\((['"]?)(.*?)\1\)/gi)) {
      references.push({ file, value: match[2] });
    }
  }
}

for (const { file, value } of references) {
  if (!value || /^(?:[a-z]+:|\/\/|#)/i.test(value)) continue;
  const clean = value.replace(/&amp;/g, "&").split(/[?#]/)[0];
  if (!clean) continue;

  const target = clean.startsWith("/") ? join(root, clean) : resolve(dirname(file), decodeURIComponent(clean));
  if (!target.startsWith(root)) {
    failures.push(`${relative(root, file)} references a path outside the archive: ${value}`);
    continue;
  }

  try {
    const info = await stat(target);
    if (!info.isFile()) failures.push(`${relative(root, file)} references a non-file: ${value}`);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    failures.push(`${relative(root, file)} has a broken local reference: ${value}`);
  }
}

if (failures.length) throw new Error([...new Set(failures)].join("\n"));
console.log(`Verified ${files.length} wedding archive files with no Bluehost dependencies or broken local references.`);

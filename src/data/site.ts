import wordpress from "./wordpress.json";

export interface Term {
  name: string;
  slug: string;
}

export interface Media {
  alt: string;
  height: number | null;
  path: string;
  width: number | null;
}

export interface Entry {
  id: number;
  type: "post" | "page";
  slug: string;
  date: string;
  modified: string;
  title: string;
  excerpt: string;
  content: string;
  featuredMedia: Media | null;
  categories: Term[];
  tags: Term[];
}

export const posts = (wordpress.posts as Entry[]).toSorted(
  (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
);

export const pages = wordpress.pages as Entry[];

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-CA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Vancouver",
  }).format(new Date(date));
}

export function shortDate(date: string) {
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    year: "numeric",
    timeZone: "America/Vancouver",
  }).format(new Date(date));
}

export function summary(entry: Entry, length = 190) {
  const clean = entry.excerpt.replace(/\s*\[…\]\s*$/, "").trim();
  if (clean.length <= length) return clean;
  return `${clean.slice(0, length).replace(/\s+\S*$/, "")}…`;
}

export function topic(entry: Entry) {
  const terms = [...entry.tags, ...entry.categories].filter((term) => term.slug !== "uncategorized");
  const slugs = new Set(terms.map((term) => term.slug));
  if (["book-review", "book-reviews", "books", "fantasy", "sci-fi", "sci-fi-2"].some((slug) => slugs.has(slug))) {
    return "Reading";
  }
  if (["data-science", "statistics", "machine-learning", "r", "coding"].some((slug) => slugs.has(slug))) {
    return "Data science";
  }
  if (["marketing", "measurement", "attribution", "content-attribution"].some((slug) => slugs.has(slug))) {
    return "Measurement";
  }
  return terms[0]?.name ?? "Notes";
}

export const allCategories = Array.from(
  new Map(posts.flatMap((post) => post.categories).map((term) => [term.slug, term])).values(),
).toSorted((a, b) => a.name.localeCompare(b.name));

export const allTags = Array.from(
  new Map(posts.flatMap((post) => post.tags).map((term) => [term.slug, term])).values(),
).toSorted((a, b) => a.name.localeCompare(b.name));

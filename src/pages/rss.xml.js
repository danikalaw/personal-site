import rss from "@astrojs/rss";
import { posts } from "../data/site";

export function GET(context) {
  return rss({
    title: "Danika Law",
    description: "Data science, thoughtful measurement, and notes from a life spent reading widely.",
    site: context.site,
    items: posts.map((post) => ({
      title: post.title,
      description: post.excerpt,
      pubDate: new Date(post.date),
      link: `/${post.slug}/`,
    })),
    customData: "<language>en-ca</language>",
  });
}

import fs from "fs";
import path from "path";

export type DocMeta = {
  slug: string;
  filename: string;
  title: string;
  category: "guides";
};

const ALLOWED_EXT = new Set([".md", ".markdown", ".txt"]);

function guidesDir() {
  // website/ -> ../bolt-website/docs (user-facing guides)
  return path.resolve(process.cwd(), "../bolt-website/docs");
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function humanize(name: string) {
  const base = name.replace(/[-_]+/g, " ").trim();
  return base.charAt(0).toUpperCase() + base.slice(1);
}

export function getAllDocs(): DocMeta[] {
  const dir = guidesDir();
  const all: DocMeta[] = [];
  if (fs.existsSync(dir)) {
    const files = fs
      .readdirSync(dir)
      .filter(f => ALLOWED_EXT.has(path.extname(f).toLowerCase()));
    for (const filename of files) {
      const base = path.basename(filename, path.extname(filename));
      const slug = slugify(base);
      const abs = path.join(dir, filename);
      const content = fs.readFileSync(abs, "utf8");
      const firstHeading = content
        .split(/\r?\n/)
        .map(l => l.trim())
        .find(l => l.startsWith("#"));
      const title = firstHeading
        ? firstHeading.replace(/^#+\s*/, "").trim()
        : humanize(base);
      all.push({
        slug,
        filename: path.relative(process.cwd(), abs),
        title,
        category: "guides",
      });
    }
  }
  all.sort((a, b) => a.title.localeCompare(b.title));
  return all;
}

export function getDocBySlug(
  slug: string
): { meta: DocMeta; content: string } | null {
  const all = getAllDocs();
  const meta = all.find(m => m.slug === slug);
  if (!meta) return null;
  const abs = path.isAbsolute(meta.filename)
    ? meta.filename
    : path.resolve(process.cwd(), meta.filename);
  const content = fs.readFileSync(abs, "utf8");
  return { meta, content };
}

export function getDocsDirPath(): string {
  return guidesDir();
}

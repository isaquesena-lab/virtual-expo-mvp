/** Make a URL-safe slug from arbitrary text. */
export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || "booth";
}

/** Append a short random suffix so slugs stay unique without a lookup race. */
export function uniqueSlug(input: string): string {
  const suffix = crypto.randomUUID().slice(0, 6);
  return `${slugify(input)}-${suffix}`;
}

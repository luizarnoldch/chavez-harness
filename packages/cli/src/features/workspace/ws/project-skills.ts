import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type ProjectSkill = {
  name: string;
  description: string;
};

/** Lee `name` y `description` del frontmatter de un SKILL.md. */
export function parseSkillFrontmatter(markdown: string): {
  name?: string;
  description?: string;
} {
  const text = markdown.replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return {};

  const body: string[] = [];
  let closed = false;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i]?.trim() === "---") {
      closed = true;
      break;
    }
    body.push(lines[i] ?? "");
  }
  if (!closed) return {};

  const fields: Record<string, string> = {};
  let key: string | null = null;
  let parts: string[] = [];

  const flush = () => {
    if (!key) return;
    const value = parts.join(" ").replace(/\s+/g, " ").trim();
    if (value) fields[key] = value;
    key = null;
    parts = [];
  };

  for (const line of body) {
    if (/^\s/.test(line) && key) {
      const trimmed = line.trim();
      if (trimmed) parts.push(trimmed);
      continue;
    }
    flush();
    const match = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (!match) continue;
    key = match[1] ?? null;
    const raw = (match[2] ?? "").trim();
    if (raw === ">" || raw === ">-" || raw === "|" || raw === "|-") {
      parts = [];
    } else if (raw) {
      parts = [raw.replace(/^["']|["']$/g, "")];
    }
  }
  flush();

  return {
    name: fields.name,
    description: fields.description,
  };
}

/** Skills del harness: cada hijo de `<root>/.cursor/skills` que tenga SKILL.md. */
export function listProjectSkills(repoRoot: string): ProjectSkill[] {
  const dir = join(repoRoot, ".cursor", "skills");
  if (!existsSync(dir)) return [];

  const folders = readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const skills: ProjectSkill[] = [];
  for (const folder of folders) {
    const skillFile = join(dir, folder, "SKILL.md");
    if (!existsSync(skillFile)) continue;
    const parsed = parseSkillFrontmatter(readFileSync(skillFile, "utf8"));
    skills.push({
      name: parsed.name?.trim() || folder,
      description: parsed.description?.trim() ?? "",
    });
  }
  return skills;
}

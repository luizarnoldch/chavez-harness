import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { listProjectSkills } from "../project-skills.ts";

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), "project-skills-"));
  mkdirSync(join(root, ".cursor", "skills"), { recursive: true });
  return root;
}

describe("listProjectSkills", () => {
  test("lee name y description del frontmatter", () => {
    const root = fixture();
    const dir = join(root, ".cursor", "skills", "alpha");
    mkdirSync(dir);
    writeFileSync(
      join(dir, "SKILL.md"),
      [
        "---",
        "name: alpha",
        "description: >-",
        "  Primera línea",
        "  segunda línea",
        "---",
        "",
        "# Alpha",
        "",
      ].join("\n"),
    );

    expect(listProjectSkills(root)).toEqual([
      { name: "alpha", description: "Primera línea segunda línea" },
    ]);
  });

  test("ignora carpetas sin SKILL.md", () => {
    const root = fixture();
    mkdirSync(join(root, ".cursor", "skills", "vacia"));
    const real = join(root, ".cursor", "skills", "real");
    mkdirSync(real);
    writeFileSync(
      join(real, "SKILL.md"),
      "---\nname: real\ndescription: una\n---\n",
    );

    expect(listProjectSkills(root).map((skill) => skill.name)).toEqual(["real"]);
  });

  test("usa el nombre de carpeta si falta name", () => {
    const root = fixture();
    const dir = join(root, ".cursor", "skills", "sin-nombre");
    mkdirSync(dir);
    writeFileSync(join(dir, "SKILL.md"), "---\ndescription: solo texto\n---\n");

    expect(listProjectSkills(root)).toEqual([
      { name: "sin-nombre", description: "solo texto" },
    ]);
  });
});

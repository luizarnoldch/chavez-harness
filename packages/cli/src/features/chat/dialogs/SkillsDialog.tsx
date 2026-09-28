import type { ScrollBoxRenderable } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { useEffect, useRef, useState } from "react";
import { matchesShortcut } from "../../../lib/registry/match";
import { getShortcut } from "../../../lib/registry/shortcuts";
import {
  listProjectSkills,
  type ProjectSkill,
} from "../../workspace/ws/project-skills.ts";
import { resolveHarnessRepoRoot } from "../../workspace/ws/cursor-sdk.ts";

const MAX_VISIBLE = 8;

type SkillsDialogProps = {
  onClose: () => void;
};

function rowLabel(skill: ProjectSkill): string {
  if (!skill.description) return skill.name;
  return `${skill.name} — ${skill.description}`;
}

export function SkillsDialog({ onClose }: SkillsDialogProps) {
  const [skills] = useState(() => listProjectSkills(resolveHarnessRepoRoot()));
  const [selectedIndex, setSelectedIndex] = useState(0);

  useKeyboard((key) => {
    if (matchesShortcut(key, getShortcut("focus-prompt")) || key.name === "escape") {
      key.preventDefault();
      onClose();
      return;
    }
    if (skills.length === 0) return;
    if (key.name === "up" || key.name === "k") {
      key.preventDefault();
      setSelectedIndex((i) => Math.max(0, i - 1));
      return;
    }
    if (key.name === "down" || key.name === "j") {
      key.preventDefault();
      setSelectedIndex((i) => Math.min(skills.length - 1, i + 1));
    }
  });

  if (skills.length === 0) {
    return (
      <box
        border
        borderColor="#414868"
        title="Skills"
        paddingLeft={1}
        paddingRight={1}
        height={3}
      >
        <text fg="#888888">No hay skills en .cursor/skills</text>
      </box>
    );
  }

  const visibleRows = Math.min(skills.length, MAX_VISIBLE);
  const safeIndex = Math.min(selectedIndex, skills.length - 1);

  return (
    <SkillsList skills={skills} safeIndex={safeIndex} visibleRows={visibleRows} />
  );
}

function SkillsList({
  skills,
  safeIndex,
  visibleRows,
}: {
  skills: ProjectSkill[];
  safeIndex: number;
  visibleRows: number;
}) {
  const scrollRef = useRef<ScrollBoxRenderable>(null);

  useEffect(() => {
    scrollRef.current?.scrollChildIntoView(`skill-${safeIndex}`);
  }, [safeIndex]);

  return (
    <box border borderColor="#7aa2f7" title="Skills" height={visibleRows + 2}>
      <scrollbox ref={scrollRef} height={visibleRows} flexGrow={1}>
        {skills.map((skill, index) => {
          const selected = index === safeIndex;
          return (
            <box
              key={skill.name}
              id={`skill-${index}`}
              height={1}
              paddingLeft={1}
              paddingRight={1}
              backgroundColor={selected ? "#334455" : undefined}
            >
              <text fg={selected ? "#FFFF00" : "#FFFFFF"}>{rowLabel(skill)}</text>
            </box>
          );
        })}
      </scrollbox>
    </box>
  );
}

import {
  Bot,
  Brain,
  BriefcaseBusiness,
  Cpu,
  FolderCode,
  LayoutDashboard,
  Puzzle,
  RefreshCw,
  SquareKanban,
  Workflow,
  type LucideIcon,
} from "lucide-react";

export type NavKey =
  | "dashboard"
  | "workspaces"
  | "projects"
  | "brain"
  | "arsenal"
  | "arsenal:agents"
  | "arsenal:skills"
  | "arsenal:providers"
  | "arsenal:workflows"
  | "arsenal:sync";

export type NavItem = {
  key: NavKey;
  label: string;
  /** Tab bar label when `label` is too long for a phone. */
  shortLabel?: string;
  href: string;
  icon: LucideIcon;
  /** One line used by ComingSoon pages and the Arsenal list. */
  description: string;
  /** Not built yet: links to a "Próximamente" page. */
  soon?: boolean;
};

export const WORK_NAV: NavItem[] = [
  {
    key: "dashboard",
    label: "Inicio",
    href: "/",
    icon: LayoutDashboard,
    description: "Resumen en vivo: tu PC, workspaces, sesiones y actividad del TUI y la web.",
  },
  {
    key: "workspaces",
    label: "Workspaces",
    href: "/workspaces",
    icon: FolderCode,
    description: "Carpetas donde el agente abre sesiones, enlazadas desde el TUI.",
  },
  {
    key: "projects",
    label: "Proyectos",
    href: "/projects",
    icon: SquareKanban,
    description:
      "Tableros por proyecto: tickets Todo → Plan → Build → Test → Done enlazados a sesiones del agente.",
    soon: true,
  },
  {
    key: "brain",
    label: "Second Brain",
    shortLabel: "Brain",
    href: "/brain",
    icon: Brain,
    description:
      "Notas OKF en markdown por vault: mermaid, tablas, wikilinks y enlaces a tickets.",
    soon: true,
  },
];

export const ARSENAL_HOME: NavItem = {
  key: "arsenal",
  label: "Arsenal",
  href: "/arsenal",
  icon: BriefcaseBusiness,
  description: "Agentes, skills y los modelos con los que corren.",
  soon: true,
};

export const ARSENAL_NAV: NavItem[] = [
  {
    key: "arsenal:agents",
    label: "Agentes",
    href: "/arsenal/agents",
    icon: Bot,
    description: "Prompts de sistema en markdown y alcance de herramientas, desde .agents/agents.",
    soon: true,
  },
  {
    key: "arsenal:skills",
    label: "Skills",
    href: "/arsenal/skills",
    icon: Puzzle,
    description: "Paquetes SKILL.md con scripts/, assets/ y references/ en .agents/skills.",
    soon: true,
  },
  {
    key: "arsenal:providers",
    label: "Proveedores",
    href: "/arsenal/providers",
    icon: Cpu,
    description: "Backends LLM y credenciales con las que corren tus sesiones.",
  },
  {
    key: "arsenal:workflows",
    label: "Workflows",
    href: "/arsenal/workflows",
    icon: Workflow,
    description: "Patrones de orquestación: cómo los agentes se pasan el trabajo.",
    soon: true,
  },
  {
    key: "arsenal:sync",
    label: "Sync",
    href: "/arsenal/sync",
    icon: RefreshCw,
    description: ".agents → Claude Code · Cursor · Codex · OpenCode, carpetas sincronizadas.",
    soon: true,
  },
];

/** Bottom tab bar on phones: Inicio, Workspaces, Proyectos and Arsenal (Brain lives in the rail). */
export const TAB_NAV: NavItem[] = [...WORK_NAV.filter((item) => item.key !== "brain"), ARSENAL_HOME];

export const ALL_NAV: NavItem[] = [...WORK_NAV, ARSENAL_HOME, ...ARSENAL_NAV];

export function findNavItem(key: NavKey): NavItem | undefined {
  return ALL_NAV.find((item) => item.key === key);
}

/** Top-level section a key belongs to (`arsenal:providers` → `arsenal`). */
export function sectionOf(key: NavKey): NavKey {
  return key.startsWith("arsenal") ? "arsenal" : key;
}

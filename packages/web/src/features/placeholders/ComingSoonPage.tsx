"use client";

import { ChevronRight } from "lucide-react";
import { ComingSoon } from "@/components/common/ComingSoon";
import { ListGroup, Section } from "@/components/common/Section";
import { StatusPill } from "@/components/common/StatusPill";
import { AppShell, Page } from "@/components/shell/AppShell";
import {
  ARSENAL_HOME,
  ARSENAL_NAV,
  findNavItem,
  type NavKey,
} from "@/components/shell/nav-items";

type ComingSoonPageProps = {
  section: NavKey;
};

/** Sections from the mock without a backend yet (projects, brain, arsenal/*). */
export function ComingSoonPage({ section }: ComingSoonPageProps) {
  const item = findNavItem(section) ?? ARSENAL_HOME;
  const isArsenal = section.startsWith("arsenal");
  const isArsenalHome = section === "arsenal";

  return (
    <AppShell
      active={section}
      title={item.label}
      subtitle={item.description}
      backHref={isArsenal && !isArsenalHome ? "/arsenal" : undefined}
    >
      <Page>
        <ComingSoon title={item.label} description={item.description} icon={item.icon}>
          {isArsenalHome ? <ArsenalSections /> : null}
        </ComingSoon>
      </Page>
    </AppShell>
  );
}

/** Arsenal home still links to its sub-sections (Providers works today). */
function ArsenalSections() {
  return (
    <Section title="Secciones">
      <ListGroup>
        {ARSENAL_NAV.map((nav) => {
          const Icon = nav.icon;
          return (
            <a
              key={nav.key}
              href={nav.href}
              className="flex min-h-14 items-center gap-3 px-4 py-3 transition-colors hover:bg-muted"
            >
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Icon className="size-[18px]" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate font-semibold">{nav.label}</span>
                <span className="truncate text-[13px] text-faint">{nav.description}</span>
              </span>
              {nav.soon ? (
                <StatusPill size="sm" tone="backlog">
                  Próximamente
                </StatusPill>
              ) : (
                <StatusPill size="sm" tone="done">
                  Disponible
                </StatusPill>
              )}
              <ChevronRight className="size-4 shrink-0 text-faint" />
            </a>
          );
        })}
      </ListGroup>
    </Section>
  );
}

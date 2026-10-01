import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
};

/** "H" mark from the mock's favicon / rail brand. */
export function BrandMark({ className }: BrandMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-foreground text-background",
        className,
      )}
    >
      <svg
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="size-4"
      >
        <path d="M4.5 3v10M11.5 3v10M4.5 8h7" />
      </svg>
    </span>
  );
}

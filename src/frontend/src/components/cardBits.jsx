// components/cardBits.jsx — Small shared pieces for the optimize grid cards
// (hotels / flights / cars). Keeps the three cards visually consistent without
// duplicating markup. Light theme: ink/cream/bonza, tabular-nums on figures.

// Stable per-card photo seed from an id like "hotel_12" / "flight_3".
export const seedFromId = (id) => Number(String(id).split("_")[1]) || 1;

// Results-grid column class, driven by whether the chat rail is open.
export const gridColsClass = (columns) =>
  columns === 3 ? "sm:grid-cols-2 xl:grid-cols-3" : "sm:grid-cols-2";

// Shared wrapper className for a grid card (selected / disabled states), with a
// keyboard focus ring.
export const cardClass = (selected, disabled) =>
  [
    "group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl bg-white text-left font-jakarta shadow-[0_1px_2px_rgba(40,30,20,0.04),0_10px_30px_rgba(120,80,50,0.08)] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-bonza focus-visible:ring-offset-2",
    disabled ? "cursor-not-allowed opacity-50" : "hover:-translate-y-0.5 hover:shadow-[0_16px_44px_rgba(120,80,50,0.16)]",
    selected ? "ring-2 ring-bonza" : "ring-1 ring-black/5",
  ].join(" ");

// A11y props so a <div> card behaves like a toggle button while still hosting
// nested interactive controls (the photo carousel) — which a real <button> can't.
export const cardButtonProps = (disabled, onClick, selected = false) => ({
  role: "button",
  tabIndex: disabled ? -1 : 0,
  "aria-disabled": disabled || undefined,
  "aria-pressed": selected,
  onClick: disabled ? undefined : onClick,
  onKeyDown: disabled
    ? undefined
    : (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      },
});

// Selected check badge — pops in when a card becomes the active pick.
export function SelectedBadge() {
  return (
    <span className="absolute right-2.5 top-2.5 z-10 flex h-7 w-7 animate-pop items-center justify-center rounded-full bg-bonza text-white shadow-md ring-2 ring-white">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </span>
  );
}

// Shimmering placeholder shown while a grid is (re)fetching its inventory.
export function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#efe9e1]">
        <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent motion-reduce:animate-none" />
      </div>
      <div className="space-y-2 p-3.5">
        <div className="h-3 w-2/5 rounded bg-[#efe9e1]" />
        <div className="h-4 w-4/5 rounded bg-[#efe9e1]" />
        <div className="h-3 w-3/5 rounded bg-[#efe9e1]" />
        <div className="mt-3 flex justify-between">
          <div className="h-4 w-1/4 rounded bg-[#efe9e1]" />
          <div className="h-4 w-1/4 rounded bg-[#efe9e1]" />
        </div>
      </div>
    </div>
  );
}

// A grid of shimmering skeletons shown on first load / while (re)fetching.
export function SkeletonGrid({ columns = 2, count = 6 }) {
  return (
    <div className={`grid grid-cols-1 gap-4 ${gridColsClass(columns)}`}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

// Staggered rise-in props for a card at position `index` in the grid.
export const cardRevealProps = (index) => ({
  className: "animate-cardin motion-reduce:animate-none",
  style: { animationDelay: `${Math.min(index, 10) * 35}ms` },
});

// Small neutral tag (e.g. "Free cancellation", "Refundable").
export function Tag({ children }) {
  return (
    <span className="rounded-md bg-cream px-2 py-0.5 text-[10px] font-semibold text-ink-soft ring-1 ring-[#e7e1d8]">
      {children}
    </span>
  );
}

// Loyalty / vendor pills under the photo. First is highlighted (terra), the rest
// are outlined. Falsy / empty entries are dropped.
export function ProgramPills({ programs = [] }) {
  const items = programs.filter(Boolean);
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((p, i) => (
        <span
          key={p}
          className={[
            "rounded-md px-2 py-0.5 text-[11px] font-semibold",
            i === 0
              ? "bg-bonza text-white"
              : "bg-white text-ink-soft ring-1 ring-[#e3ded6]",
          ].join(" ")}
        >
          {p}
        </span>
      ))}
    </div>
  );
}

// Green "cash value per point" chip, e.g. "0.96 ¢/pt". Hidden below a floor so we
// never flaunt a poor redemption (loyalty-drives-offers honesty).
export function PointsValueBadge({ cents }) {
  if (!cents || cents <= 0) return null;
  return (
    <span className="inline-flex shrink-0 items-center rounded-md bg-[#EAF6EE] px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-[#1E7E40]">
      {cents.toFixed(2)} ¢/pt
    </span>
  );
}

// Deal-rating chip (hotels) — filled star + number on a green pill.
export function RatingChip({ rating }) {
  if (rating == null) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#1f7a3f] px-2 py-0.5 text-[11px] font-bold tabular-nums text-white">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2.5l2.9 5.88 6.49.94-4.69 4.57 1.1 6.46L12 17.3l-5.8 3.05 1.1-6.46-4.69-4.57 6.49-.94L12 2.5z" />
      </svg>
      {rating}
    </span>
  );
}

// Shared "Exceeds budget" overlay badge for disabled cards.
export function BudgetBadge() {
  return (
    <span className="absolute left-2.5 top-2.5 z-10 rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-bold text-[#c0603c] shadow-sm backdrop-blur">
      Exceeds budget
    </span>
  );
}

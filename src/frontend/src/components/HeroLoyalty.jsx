// components/HeroLoyalty.jsx — Hero loyalty entry point (Plus Jakarta Sans).
// A small circular button pinned in the cinematic hero's bottom strip (where the
// reference site puts its avatar). The hero stays clean — no card baked onto the
// photo — and the full LoyaltyCard loads ON DEMAND as a popover above the button.
//   • loyaltyPoints present -> "Your loyalty"; click toggles the popover.
//   • falsy (no Plaid yet)  -> "Connect Plaid"; click calls onConnect(), never shows
//     balances (real or mock) to a logged-out visitor.
// Accessible: focus trap while open, Escape + outer-click close, focus returns to the
// button on close. Props: { loyaltyPoints, onConnect }.
import { useEffect, useRef, useState } from "react";
import LoyaltyCard from "./LoyaltyCard";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function HeroLoyalty({ loyaltyPoints, onConnect }) {
  const connected = Boolean(loyaltyPoints);
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const popoverRef = useRef(null);

  const close = () => setOpen(false);

  const handleClick = () => {
    if (!connected) {
      onConnect?.();
      return;
    }
    setOpen((o) => !o);
  };

  // While open: move focus in, trap Tab, close on Escape, restore focus on close.
  useEffect(() => {
    if (!open) return undefined;

    const pop = popoverRef.current;
    const first = pop?.querySelector(FOCUSABLE);
    first?.focus();

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
        return;
      }
      if (e.key !== "Tab" || !pop) return;
      const nodes = Array.from(pop.querySelectorAll(FOCUSABLE));
      if (nodes.length === 0) return;
      const firstNode = nodes[0];
      const lastNode = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === firstNode) {
        e.preventDefault();
        lastNode.focus();
      } else if (!e.shiftKey && document.activeElement === lastNode) {
        e.preventDefault();
        firstNode.focus();
      }
    };

    // Close on clicks outside the popover and the trigger button.
    const onPointerDown = (e) => {
      if (pop?.contains(e.target) || buttonRef.current?.contains(e.target)) return;
      close();
    };

    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("pointerdown", onPointerDown, true);
      buttonRef.current?.focus();
    };
  }, [open]);

  const label = connected ? "Your loyalty" : "Connect Plaid";

  return (
    <div className="relative font-jakarta">
      {/* Popover — full card, opens upward, right-aligned to the button. */}
      {open && connected && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Your loyalty balance"
          className="absolute bottom-[calc(100%+0.75rem)] right-0 z-20 w-[min(22rem,calc(100vw-2rem))] max-w-sm origin-bottom-right animate-fadein"
        >
          <div className="relative">
            <button
              type="button"
              onClick={close}
              aria-label="Close loyalty balance"
              className="absolute -right-2 -top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white text-ink-soft shadow-md ring-1 ring-black/5 hover:text-ink"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <LoyaltyCard loyaltyPoints={loyaltyPoints} variant="full" />
          </div>
        </div>
      )}

      {/* Button cluster: label + circular glassy trigger with a notification dot. */}
      <div className="flex items-center gap-2.5">
        <span className="hidden text-[13px] font-semibold text-white drop-shadow sm:inline">
          {label}
        </span>
        <button
          ref={buttonRef}
          type="button"
          onClick={handleClick}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={label}
          className="relative flex h-[54px] w-[54px] items-center justify-center rounded-full bg-white/16 text-white ring-2 ring-white/65 backdrop-blur transition-colors hover:bg-white/25 focus:outline-none focus-visible:ring-4 focus-visible:ring-white"
        >
          {/* Notification dot + subtle pulse (paused under reduced motion). */}
          <span className="absolute right-1 top-1 flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-bonza opacity-70 motion-reduce:animate-none" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-bonza ring-2 ring-white/80" />
          </span>
          {/* Star / points glyph */}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2.5l2.9 5.88 6.49.94-4.69 4.57 1.1 6.46L12 17.3l-5.8 3.05 1.1-6.46-4.69-4.57 6.49-.94L12 2.5z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

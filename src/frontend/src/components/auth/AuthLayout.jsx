// components/auth/AuthLayout.jsx — shared shell for the sign-in and sign-up pages. 50/50 grid: the
// destination slideshow on the left (decorative — hidden below lg so the form owns the phone screen), the
// Clerk form on the right. Renders the heading/eyebrow and the legal line so the Clerk card can stay
// chromeless. `slide` optionally overrides the slideshow's heading/body copy (sign-up variant).
import DestinationSlideshow from "./DestinationSlideshow";

export default function AuthLayout({ eyebrow, title, subtitle, children, slide }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen font-jakarta">
      {/* Left — slideshow (decorative, hidden below lg) */}
      <div className="hidden lg:block">
        <DestinationSlideshow {...(slide || {})} />
      </div>

      {/* Right — the form */}
      <div className="bg-[#FCFBF9] flex items-center justify-center p-10">
        <div className="w-full max-w-[372px]">
          <p className="text-[11px] font-bold text-bonza tracking-[1.6px] mb-[0.55rem] flex items-center gap-[9px]">
            {eyebrow}
            <span className="flex-1 h-px bg-bonza/[0.26]" />
          </p>

          <h2 className="text-[26px] font-bold text-[#141210] tracking-[-0.7px] mb-1.5">{title}</h2>

          {subtitle && <p className="text-[14px] text-[#7A7269] mb-7">{subtitle}</p>}

          {children}

          <div className="mt-6 text-center">
            <p className="text-[13px] text-[#7A7269]">
              By continuing you agree to our{" "}
              <a href="/terms" className="text-bonza font-semibold">
                Terms
              </a>{" "}
              and{" "}
              <a href="/privacy" className="text-bonza font-semibold">
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

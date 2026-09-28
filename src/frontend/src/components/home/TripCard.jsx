// components/home/TripCard.jsx — Phase 18 package card. Photo on top, route + dates, then "£X or <points>",
// with an "Award seats open" tag when available. Used on the homepage "Popular trips" rail and on the
// country landing page (each city is one of these). Clicking opens a real flight+hotel search for the
// trip's own origin/dest/dates/party in a new tab. Inline SVG-free — no icons here.
import { buildSearchUrl, openSearch } from "../../utils/searchUrl";

export default function TripCard({ trip }) {
  const openTrip = () =>
    openSearch(
      buildSearchUrl({
        origin: trip.originCode,
        destination: trip.destCode,
        departureDate: trip.departDate,
        returnDate: trip.returnDate,
        travelers: trip.adults || 2,
        style: "points_max",
      })
    );

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={openTrip}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openTrip();
        }
      }}
      className="snap-start group cursor-pointer"
    >
      <div className="relative aspect-[4/3] rounded-[14px] overflow-hidden mb-[0.8rem]">
        <div className="absolute inset-0" style={{ background: trip.gradient }} />
        {trip.imageUrl && (
          <img
            src={trip.imageUrl}
            alt=""
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        )}
        {trip.awardAvailable && (
          <span className="absolute top-[0.7rem] left-[0.7rem] z-[2] text-[10.5px] font-bold text-[#0F2E1C] bg-[#9FE9BB] px-2 py-[3px] rounded-md">
            Award seats open
          </span>
        )}
      </div>
      <p className="text-[15px] font-bold text-[#141210] tracking-[-0.25px] mb-[3px]">{trip.routeLabel}</p>
      <p className="text-[12.5px] text-[#8A8078] mb-[0.55rem]">{trip.dateLabel} · Flight + hotel</p>
      <div className="flex items-baseline gap-[0.55rem] flex-wrap tabular-nums">
        <span className="text-[14.5px] font-bold text-[#141210]">£{trip.cashTotal.toLocaleString()}</span>
        {trip.pointsLabel && (
          <>
            <span className="text-[11.5px] text-[#B8AFA3]">or</span>
            <span className="text-[12.5px] font-semibold text-[#B5603F]">{trip.pointsLabel}</span>
          </>
        )}
      </div>
    </div>
  );
}

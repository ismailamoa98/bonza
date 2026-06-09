// components/BookingCard.jsx — One "Book Now" card on Step 3 (flight/hotel/car).
// Opens the affiliate URL in a new tab and fires conversion tracking on click.
// Props: { title, left, right, buttonLabel, onBook }.
export default function BookingCard({ title, left, right, buttonLabel, onBook }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="font-semibold text-slate-800">{title}</h3>
      <div className="mt-2 flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between">
        <span className="text-slate-600">{left}</span>
        <span className="font-medium text-slate-800">{right}</span>
      </div>
      <button
        type="button"
        onClick={onBook}
        className="mt-3 w-full rounded-lg bg-bonza px-4 py-2 text-sm font-semibold text-white hover:bg-bonza-dark"
      >
        {buttonLabel}
      </button>
    </div>
  );
}

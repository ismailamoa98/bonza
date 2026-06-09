// components/VendorComparison.jsx — Vendor options table for one category.
// Rows show vendor / class / cash / points / benefits with a select control.
// Selecting a vendor highlights its row and triggers live recalculation.
// Props: { title, vendors, selectedId, onSelect }.
import { vendorCost, formatPoints, benefitLabel } from "../utils/format";

export default function VendorComparison({ title, vendors = [], selectedId, onSelect }) {
  return (
    <div className="mt-3">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </p>
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">Vendor</th>
              <th className="px-3 py-2 font-medium">Class</th>
              <th className="px-3 py-2 font-medium text-right">Cash</th>
              <th className="px-3 py-2 font-medium text-right">Points</th>
              <th className="px-3 py-2 font-medium">Perks</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {vendors.map((v) => {
              const selected = v.id === selectedId;
              return (
                <tr
                  key={v.id}
                  onClick={() => onSelect(v)}
                  className={[
                    "cursor-pointer border-t border-slate-100 transition-colors",
                    selected ? "bg-bonza-50" : "hover:bg-slate-50",
                  ].join(" ")}
                >
                  <td className="px-3 py-2 font-medium text-slate-800">{v.vendor}</td>
                  <td className="px-3 py-2 text-slate-600">{v.label}</td>
                  <td
                    className={[
                      "px-3 py-2 text-right",
                      v.cashCost > 0 ? "text-slate-800" : "font-semibold text-green-600",
                    ].join(" ")}
                  >
                    {vendorCost(v.cashCost)}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-600">
                    {v.pointsCost > 0 ? `${formatPoints(v.pointsCost)}` : "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">
                    {(v.benefits || []).map(benefitLabel).join(", ") || "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span
                      className={[
                        "inline-flex h-4 w-4 items-center justify-center rounded-full border",
                        selected ? "border-bonza bg-bonza text-white" : "border-slate-300",
                      ].join(" ")}
                    >
                      {selected ? "✓" : ""}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

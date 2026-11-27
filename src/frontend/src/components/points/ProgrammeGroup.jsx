// components/points/ProgrammeGroup.jsx — one category section with its rows + an "add programme" hint.
import ProgrammeRow from "./ProgrammeRow";
import ProgrammeDetailPanel from "./ProgrammeDetailPanel";
import { PlusIcon } from "./icons";

const ADD_HINTS = {
  card: "Add Capital One or Barclays",
  hotel: "Add IHG, Accor or Wyndham",
  airline: "Add Aeroplan, Flying Blue or Virgin Atlantic",
  car: "Add Hertz Gold, Avis Preferred or National Emerald for upgrades",
};

export default function ProgrammeGroup({ label, meta, accounts, openId, onToggle, category, onAdd, onEdit }) {
  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 px-0.5 pb-1.5">
        <span className="text-[10.5px] font-bold text-ink-600/70 tracking-[0.9px] uppercase">{label}</span>
        <span className="text-[11px] text-ink-300 ml-auto font-medium">
          {meta || `${accounts.length} programme${accounts.length === 1 ? "" : "s"}`}
        </span>
      </div>

      <div className="border-t border-ink-900/[0.09]">
        {accounts.map((account) => (
          <div key={account.id}>
            <ProgrammeRow
              account={account}
              open={openId === account.id}
              onClick={() => (account.isTransferable || account.category !== "car" ? onToggle(account.id) : null)}
            />
            {openId === account.id && (
              <ProgrammeDetailPanel accountId={account.id} rowAccount={account} onEdit={onEdit} />
            )}
          </div>
        ))}

        <button
          onClick={onAdd}
          className="w-full flex items-center gap-2.5 py-3 px-0.5 text-ink-300 hover:text-bonza border-b border-ink-900/[0.07] text-left transition-colors"
        >
          <PlusIcon width="14" height="14" />
          <span className="text-[12px] font-medium">{ADD_HINTS[category]}</span>
        </button>
      </div>
    </div>
  );
}

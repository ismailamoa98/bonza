// pages/PointsPage.jsx — Phase 14 "Points" portfolio: every connected programme grouped by category, with
// an expandable detail panel (balance, held value, best transfer, transfer table). Renders from the cached
// ProgrammeValuation/TransferPartner data via GET /points/portfolio. Navigation is global (App.jsx).
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PortfolioMetrics from "../components/points/PortfolioMetrics";
import CategoryFilter from "../components/points/CategoryFilter";
import ProgrammeGroup from "../components/points/ProgrammeGroup";
import PointsActivitySection from "../components/points/PointsActivitySection";
import AddProgrammePanel from "../components/points/AddProgrammePanel";
import { RefreshIcon, LockIcon } from "../components/points/icons";
import { getPointsPortfolio, getPointsReview } from "../utils/api";

const CATEGORY_ORDER = [
  { key: "card", label: "Credit cards", meta: "transferable" },
  { key: "hotel", label: "Hotels", meta: null },
  { key: "airline", label: "Airlines", meta: null },
  { key: "car", label: "Car rental", meta: "status only — no points" },
];

export default function PointsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [openId, setOpenId] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editAccount, setEditAccount] = useState(null); // set when editing an existing programme's balance

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [portfolio, rev] = await Promise.all([
        getPointsPortfolio(),
        getPointsReview().catch(() => null),
      ]);
      setData(portfolio);
      setReview(rev);
    } catch {
      /* leave data null — page shows empty groups */
    } finally {
      setLoading(false);
    }
  }

  // The "Gathering your points" loading screen runs the deep sync with live progress, then routes to review.
  function handleSync() {
    navigate("/points/connecting");
  }

  const toggle = (accountId) => setOpenId((prev) => (prev === accountId ? null : accountId));

  const visibleCategories = filter === "all" ? CATEGORY_ORDER : CATEGORY_ORDER.filter((c) => c.key === filter);

  return (
    <div className="min-h-screen bg-[#F7F5F1]">
      <div className="max-w-7xl mx-auto px-8 pt-8 pb-12">
        {/* Header */}
        <div className="flex items-end justify-between mb-7">
          <div>
            <h1 className="text-[30px] font-bold text-ink-900 tracking-[-0.8px] mb-1.5">Points</h1>
            <p className="text-[13.5px] text-ink-300">
              {data?.totalConnected ?? 0} programmes connected
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="text-[12.5px] font-medium text-ink-600 px-3 py-1.5 rounded-lg border border-ink-900/[0.15] hover:bg-[#EFEBE4] flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshIcon width="14" height="14" className={syncing ? "animate-spin" : ""} />
              {syncing ? "Syncing…" : "Sync balances"}
            </button>
          </div>
        </div>

        {review?.lastRun?.balancesUpdated > 0 && (
          <button
            onClick={() => navigate("/points/review")}
            className="w-full mb-4 flex items-center gap-2.5 rounded-xl bg-[#EAF0F7] text-[#2C5C8F] px-4 py-3 text-[13px] font-semibold hover:bg-[#E1EAF4]"
          >
            <span className="w-6 h-6 rounded-lg bg-white/70 flex items-center justify-center flex-shrink-0">
              <RefreshIcon width="13" height="13" />
            </span>
            {review.lastRun.balancesUpdated} balance{review.lastRun.balancesUpdated === 1 ? "" : "s"} updated from your
            statements
            <span className="ml-auto text-[12.5px]">View →</span>
          </button>
        )}

        <PortfolioMetrics metrics={data?.metrics} loading={loading} />

        <CategoryFilter
          active={filter}
          onChange={setFilter}
          counts={{
            all: data?.totalConnected ?? 0,
            hotel: data?.byCategory?.hotel?.length ?? 0,
            airline: data?.byCategory?.airline?.length ?? 0,
            card: data?.byCategory?.card?.length ?? 0,
            car: data?.byCategory?.car?.length ?? 0,
          }}
          onAdd={() => {
            setEditAccount(null);
            setAddOpen(true);
          }}
        />

        {loading ? (
          <div className="mt-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-white/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          visibleCategories.map((cat) => (
            <ProgrammeGroup
              key={cat.key}
              label={cat.label}
              meta={cat.meta}
              accounts={data?.byCategory?.[cat.key] || []}
              openId={openId}
              onToggle={toggle}
              category={cat.key}
              onAdd={() => {
                setEditAccount(null);
                setAddOpen(true);
              }}
              onEdit={(acct) => {
                setEditAccount(acct);
                setAddOpen(true);
              }}
            />
          ))
        )}

        {!loading && <PointsActivitySection />}

        <p className="flex items-center gap-2 mt-7 text-[11.5px] text-ink-300">
          <LockIcon width="13" height="13" />
          Balances sync monthly from your email. Transfer rates refresh nightly.
        </p>
      </div>

      <AddProgrammePanel
        open={addOpen}
        onClose={() => {
          setAddOpen(false);
          setEditAccount(null);
        }}
        onAdded={load}
        catalog={data?.catalog}
        editAccount={editAccount}
        accounts={data ? Object.values(data.byCategory).flat() : []}
      />
    </div>
  );
}

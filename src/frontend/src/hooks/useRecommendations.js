// hooks/useRecommendations.js — fetch + poll personalised dashboard recommendations.
import { useCallback, useEffect, useRef, useState } from "react";
import { getRecommendations } from "../utils/api";

const POLL_MS = 30 * 1000;

export function useRecommendations() {
  const [data, setData] = useState([]);
  const [status, setStatus] = useState("loading");
  const timer = useRef(null);
  const cancelled = useRef(false);

  const load = useCallback(async () => {
    clearTimeout(timer.current);
    try {
      const json = await getRecommendations();
      if (cancelled.current) return;
      setData(json.recommendations || []);
      setStatus(json.status || "ready");
      if (json.status === "generating") {
        timer.current = setTimeout(load, POLL_MS);
      }
    } catch {
      if (!cancelled.current) setStatus("error");
    }
  }, []);

  const reload = useCallback(() => {
    setStatus("generating");
    load();
  }, [load]);

  useEffect(() => {
    cancelled.current = false;
    load();
    return () => {
      cancelled.current = true;
      clearTimeout(timer.current);
    };
  }, [load]);

  return { data, status, reload };
}

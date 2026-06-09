// hooks/useTrip.js — Step 1 orchestration.
// createAndOptimize() creates the trip then immediately optimizes it, writing
// the trip id, scenarios, and opening chat message into the global store.
import { useState } from "react";
import { createTrip, optimizeTrip, apiErrorMessage } from "../utils/api";
import { useAppStore } from "../store/appStore";

export function useTrip() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const setTrip = useAppStore((s) => s.setTrip);
  const setTripId = useAppStore((s) => s.setTripId);
  const setOptimization = useAppStore((s) => s.setOptimization);

  const createAndOptimize = async (tripData) => {
    setLoading(true);
    setError(null);
    try {
      const { id } = await createTrip(tripData);
      setTrip(tripData);
      setTripId(id);

      const optimization = await optimizeTrip(id);
      setOptimization(optimization);
      return true;
    } catch (err) {
      setError(apiErrorMessage(err));
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { createAndOptimize, loading, error };
}

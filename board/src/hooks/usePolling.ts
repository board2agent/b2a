"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { BoardData } from "@/lib/types";

export function usePolling(intervalMs: number = 5000) {
  const [data, setData] = useState<BoardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const isDragging = useRef(false);
  const pendingData = useRef<BoardData | null>(null);
  // Each move increments this version; fetches that started before the move are discarded.
  const moveVersion = useRef(0);

  const fetchData = useCallback(async () => {
    // Capture version at fetch start so we can detect if a move happened mid-flight.
    const fetchVersion = moveVersion.current;
    try {
      const res = await fetch("/api/issues");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const boardData: BoardData = await res.json();

      // Discard if a move occurred after this fetch started (data is stale).
      if (fetchVersion < moveVersion.current) return;

      if (isDragging.current) {
        // Queue the update for when drag ends
        pendingData.current = boardData;
      } else {
        setData(boardData);
        setLastUpdated(new Date());
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    }
  }, []);

  // Call this immediately after a successful move to invalidate any in-flight or
  // queued poll results that reflect pre-move state.
  const markMoved = useCallback(() => {
    moveVersion.current += 1;
    pendingData.current = null;
  }, []);

  const setDragging = useCallback((dragging: boolean) => {
    isDragging.current = dragging;
    if (!dragging) {
      // Discard pending data — it was fetched before/during the drag and may be stale.
      pendingData.current = null;
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, intervalMs);
    return () => clearInterval(interval);
  }, [fetchData, intervalMs]);

  return { data, error, lastUpdated, refresh: fetchData, setDragging, markMoved };
}

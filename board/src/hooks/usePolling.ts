"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { BoardData } from "@/lib/types";

export function usePolling(intervalMs: number = 5000) {
  const [data, setData] = useState<BoardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const isDragging = useRef(false);
  const pendingData = useRef<BoardData | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/issues");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const boardData: BoardData = await res.json();

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

  const setDragging = useCallback((dragging: boolean) => {
    isDragging.current = dragging;
    if (!dragging && pendingData.current) {
      setData(pendingData.current);
      setLastUpdated(new Date());
      pendingData.current = null;
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, intervalMs);
    return () => clearInterval(interval);
  }, [fetchData, intervalMs]);

  return { data, error, lastUpdated, refresh: fetchData, setDragging };
}

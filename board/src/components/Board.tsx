"use client";

import { useState, useCallback } from "react";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { BoardData, BoardIssue } from "@/lib/types";
import { usePolling } from "@/hooks/usePolling";
import Column from "./Column";
import CardDetail from "./CardDetail";
import ConfigBar from "./ConfigBar";

export default function Board() {
  const { data, error, lastUpdated, refresh, setDragging } = usePolling(
    Number(process.env.NEXT_PUBLIC_POLL_INTERVAL_MS) || 5000
  );
  const [selectedIssue, setSelectedIssue] = useState<BoardIssue | null>(null);
  const [optimisticData, setOptimisticData] = useState<BoardData | null>(null);

  const displayData = optimisticData || data;

  const onDragStart = useCallback(() => {
    setDragging(true);
  }, [setDragging]);

  const onDragEnd = useCallback(
    async (result: DropResult) => {
      setDragging(false);

      if (!result.destination || !displayData) return;

      const { source, destination, draggableId } = result;
      if (source.droppableId === destination.droppableId && source.index === destination.index) {
        return;
      }

      const issueNumber = parseInt(draggableId, 10);
      const fromColumnId = source.droppableId;
      const toColumnId = destination.droppableId;

      // Optimistic update
      const newData = structuredClone(displayData);
      const fromColumn = newData.columns[fromColumnId];
      const toColumn = newData.columns[toColumnId];
      const [movedIssue] = fromColumn.issues.splice(source.index, 1);
      toColumn.issues.splice(destination.index, 0, movedIssue);
      setOptimisticData(newData);

      try {
        const res = await fetch("/api/move", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ issueNumber, toColumnId }),
        });

        if (!res.ok) {
          throw new Error("Move failed");
        }
      } catch {
        // Revert optimistic update
        setOptimisticData(null);
      }

      // Clear optimistic state after a short delay to let polling catch up
      setTimeout(() => setOptimisticData(null), 2000);
    },
    [displayData, setDragging]
  );

  const handleOnboard = useCallback(async () => {
    if (!confirm("This will create labels, pipeline config, and workflow in the repo. Continue?")) {
      return;
    }
    try {
      const res = await fetch("/api/onboard", { method: "POST" });
      const result = await res.json();
      if (result.success) {
        alert(`Onboarded successfully:\n${result.created.join("\n")}`);
      } else {
        alert(`Onboard failed: ${result.error}`);
      }
    } catch (err) {
      alert(`Onboard error: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }, []);

  if (error && !displayData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-500 text-lg mb-2">Failed to load board</p>
          <p className="text-gray-500 text-sm mb-4">{error}</p>
          <button
            onClick={refresh}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!displayData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading board...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <ConfigBar
        owner={process.env.NEXT_PUBLIC_GITHUB_OWNER || ""}
        repo={process.env.NEXT_PUBLIC_GITHUB_REPO || ""}
        lastUpdated={lastUpdated}
        onRefresh={refresh}
        onOnboard={handleOnboard}
      />

      {error && (
        <div className="px-4 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 text-xs text-center">
          Connection issue: {error}
        </div>
      )}

      <div className="flex-1 overflow-x-auto p-4">
        <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div className="flex gap-4 h-full">
            {displayData.columnOrder.map((colId) => {
              const column = displayData.columns[colId];
              return (
                <Column
                  key={colId}
                  columnDef={column.def}
                  issues={column.issues}
                  onCardClick={setSelectedIssue}
                  onRefresh={refresh}
                />
              );
            })}
          </div>
        </DragDropContext>
      </div>

      {selectedIssue && (
        <CardDetail issue={selectedIssue} onClose={() => setSelectedIssue(null)} />
      )}
    </div>
  );
}

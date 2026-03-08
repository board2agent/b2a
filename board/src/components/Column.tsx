"use client";

import { useState, useCallback } from "react";
import { Droppable } from "@hello-pangea/dnd";
import { BoardIssue, ColumnDef } from "@/lib/types";
import Card from "./Card";

interface ColumnProps {
  columnDef: ColumnDef;
  issues: BoardIssue[];
  onCardClick: (issue: BoardIssue) => void;
  onCreateIssue?: (title: string) => Promise<void>;
}

export default function Column({ columnDef, issues, onCardClick, onCreateIssue }: ColumnProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    const trimmed = title.trim();
    if (!trimmed || !onCreateIssue) return;
    setSubmitting(true);
    try {
      await onCreateIssue(trimmed);
      setTitle("");
      setIsAdding(false);
    } finally {
      setSubmitting(false);
    }
  }, [title, onCreateIssue]);

  return (
    <div className="flex flex-col w-72 flex-shrink-0">
      <div
        className="flex items-center justify-between px-3 py-2 rounded-t-lg"
        style={{ backgroundColor: `${columnDef.color}15` }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: columnDef.color }}
          />
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            {columnDef.title}
          </h2>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">
            {issues.length}
          </span>
          {onCreateIssue && !isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none px-1"
              title="Add issue"
            >
              +
            </button>
          )}
        </div>
      </div>

      <Droppable droppableId={columnDef.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 p-2 rounded-b-lg min-h-[200px] transition-colors ${
              snapshot.isDraggingOver
                ? "bg-blue-50 dark:bg-blue-950"
                : "bg-gray-50 dark:bg-gray-900"
            }`}
          >
            {isAdding && (
              <div className="mb-2 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <input
                  autoFocus
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSubmit();
                    if (e.key === "Escape") { setIsAdding(false); setTitle(""); }
                  }}
                  placeholder="Issue title..."
                  disabled={submitting}
                  className="w-full text-sm bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400"
                />
                <div className="flex justify-end gap-1 mt-2">
                  <button
                    onClick={() => { setIsAdding(false); setTitle(""); }}
                    className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!title.trim() || submitting}
                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-50"
                  >
                    {submitting ? "..." : "Add"}
                  </button>
                </div>
              </div>
            )}
            {issues.map((issue, index) => (
              <Card
                key={issue.number}
                issue={issue}
                index={index}
                onClick={onCardClick}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}

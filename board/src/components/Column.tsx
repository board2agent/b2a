"use client";

import { useState } from "react";
import { Droppable } from "@hello-pangea/dnd";
import { BoardIssue, ColumnDef } from "@/lib/types";
import Card from "./Card";

interface ColumnProps {
  columnDef: ColumnDef;
  issues: BoardIssue[];
  onCardClick: (issue: BoardIssue) => void;
  onRefresh?: () => void;
}

export default function Column({ columnDef, issues, onCardClick, onRefresh }: ColumnProps) {
  const isTodo = columnDef.id === "todo";
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/issues/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body: body.trim() || undefined }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create issue");
      }

      // Reset and close form, then trigger a board refresh
      setTitle("");
      setBody("");
      setShowForm(false);
      onRefresh?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create issue");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setTitle("");
    setBody("");
    setError(null);
    setShowForm(false);
  };

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
          {isTodo && (
            <button
              onClick={() => setShowForm((v) => !v)}
              title="Create issue"
              className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-base leading-none"
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
            {showForm && (
              <form
                onSubmit={handleSubmit}
                className="mb-2 p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"
              >
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Issue title"
                  autoFocus
                  className="w-full text-sm px-2 py-1 mb-2 border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Description (optional, supports Markdown)"
                  rows={3}
                  className="w-full text-sm px-2 py-1 mb-2 border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-400 resize-y"
                />
                {error && (
                  <p className="text-xs text-red-500 mb-2">{error}</p>
                )}
                <div className="flex gap-1 justify-end">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="text-xs px-2 py-1 rounded text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!title.trim() || submitting}
                    className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {submitting ? "Creating…" : "Create"}
                  </button>
                </div>
              </form>
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

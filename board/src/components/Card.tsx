"use client";

import { Draggable } from "@hello-pangea/dnd";
import { BoardIssue } from "@/lib/types";
import { getCycleCount } from "@/lib/columns";

interface CardProps {
  issue: BoardIssue;
  index: number;
  onClick: (issue: BoardIssue) => void;
}

export default function Card({ issue, index, onClick }: CardProps) {
  const cycles = getCycleCount(issue.labels);

  return (
    <Draggable draggableId={String(issue.number)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick(issue)}
          className={`p-3 mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-md transition-shadow ${
            snapshot.isDragging ? "shadow-lg ring-2 ring-blue-400" : ""
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                #{issue.number}
              </span>
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-0.5 leading-snug">
                {issue.title}
              </h3>
            </div>
            {issue.assignee && (
              <img
                src={issue.assignee.avatar_url}
                alt={issue.assignee.login}
                title={issue.assignee.login}
                className="w-6 h-6 rounded-full flex-shrink-0"
              />
            )}
          </div>

          {cycles > 0 && (
            <div className="mt-2">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                {cycles} cycle{cycles !== 1 ? "s" : ""}
              </span>
            </div>
          )}

          <div className="mt-2 flex flex-wrap gap-1">
            {issue.labels
              .filter((l) => !l.name.startsWith("status:") && !l.name.startsWith("cycles:"))
              .map((label) => (
                <span
                  key={label.name}
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-xs"
                  style={{
                    backgroundColor: `#${label.color}20`,
                    color: `#${label.color}`,
                    border: `1px solid #${label.color}40`,
                  }}
                >
                  {label.name}
                </span>
              ))}
          </div>
        </div>
      )}
    </Draggable>
  );
}

"use client";

import { Droppable } from "@hello-pangea/dnd";
import { BoardIssue, ColumnDef } from "@/lib/types";
import Card from "./Card";

interface ColumnProps {
  columnDef: ColumnDef;
  issues: BoardIssue[];
  onCardClick: (issue: BoardIssue) => void;
}

export default function Column({ columnDef, issues, onCardClick }: ColumnProps) {
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
        <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">
          {issues.length}
        </span>
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

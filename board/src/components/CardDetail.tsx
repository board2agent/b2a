"use client";

import { useEffect, useState } from "react";
import { BoardIssue, IssueComment } from "@/lib/types";

interface CardDetailProps {
  issue: BoardIssue;
  onClose: () => void;
}

export default function CardDetail({ issue, onClose }: CardDetailProps) {
  const [comments, setComments] = useState<IssueComment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/issues/${issue.number}/comments`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setComments(data);
      })
      .finally(() => setLoading(false));
  }, [issue.number]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 shadow-xl overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">
              #{issue.number}
            </span>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {issue.title}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={issue.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
            >
              GitHub
            </a>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
            >
              &times;
            </button>
          </div>
        </div>

        <div className="p-4">
          {issue.body && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
                Description
              </h3>
              <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-gray-900 p-3 rounded">
                {issue.body}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
              Activity ({comments.length})
            </h3>

            {loading ? (
              <div className="text-sm text-gray-400 py-4 text-center">
                Loading comments...
              </div>
            ) : comments.length === 0 ? (
              <div className="text-sm text-gray-400 py-4 text-center">
                No comments yet
              </div>
            ) : (
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-3"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <img
                        src={comment.user.avatar_url}
                        alt={comment.user.login}
                        className="w-5 h-5 rounded-full"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {comment.user.login}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(comment.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                      {comment.body}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

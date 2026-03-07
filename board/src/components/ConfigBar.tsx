"use client";

interface ConfigBarProps {
  owner: string;
  repo: string;
  lastUpdated: Date | null;
  onRefresh: () => void;
  onOnboard: () => void;
}

export default function ConfigBar({
  owner,
  repo,
  lastUpdated,
  onRefresh,
  onOnboard,
}: ConfigBarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-gray-900 text-gray-200 text-sm">
      <div className="flex items-center gap-4">
        <span className="font-semibold text-white">b2a</span>
        <span className="text-gray-400">
          {owner}/{repo}
        </span>
      </div>
      <div className="flex items-center gap-3">
        {lastUpdated && (
          <span className="text-gray-500 text-xs">
            Updated {lastUpdated.toLocaleTimeString()}
          </span>
        )}
        <button
          onClick={onRefresh}
          className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors"
        >
          Refresh
        </button>
        <button
          onClick={onOnboard}
          className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-500 rounded transition-colors"
        >
          Onboard Repo
        </button>
      </div>
    </div>
  );
}

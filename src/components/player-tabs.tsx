"use client";

import { useState } from "react";

export function PlayerTabs({
  tabs,
}: {
  tabs: { content: React.ReactNode; id: string; label: string }[];
}) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id);

  return (
    <div>
      <div className="flex gap-1 overflow-x-auto border-b border-border">
        {tabs.map((tab) => (
          <button
            className={`shrink-0 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              tab.id === activeTab ? "border-primary text-primary" : "border-transparent text-muted hover:text-slate-700"
            }`}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="pt-6">
        {tabs.map((tab) => (
          <div className={tab.id === activeTab ? "space-y-6" : "hidden"} key={tab.id}>
            {tab.content}
          </div>
        ))}
      </div>
    </div>
  );
}

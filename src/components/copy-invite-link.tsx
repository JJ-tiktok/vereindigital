"use client";

import { useState } from "react";

export function CopyInviteLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      className="h-9 rounded-lg border border-border px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
      onClick={copyLink}
      type="button"
    >
      {copied ? "Kopiert" : "Link kopieren"}
    </button>
  );
}

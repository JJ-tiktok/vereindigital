"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function EntryRedirect() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    router.replace(isSignedIn ? "/dashboard" : "/sign-in");
  }, [isLoaded, isSignedIn, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 text-slate-950">
      <div className="rounded-lg border border-border bg-white p-6 text-center">
        <p className="text-sm font-semibold text-slate-800">VereinDigital wird geladen</p>
        <p className="mt-2 text-sm text-muted">Wir pruefen deine Anmeldung.</p>
      </div>
    </main>
  );
}

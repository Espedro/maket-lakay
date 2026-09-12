"use client";

import { useEffect } from "react";

import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Something went wrong
          </p>
          <h1 className="text-2xl font-black">Maket Lakay hit a snag</h1>
          <p className="max-w-md text-sm text-slate-500">
            Please reload the page. If this keeps happening, contact support.
          </p>
          <button
            onClick={() => reset()}
            className="rounded-md bg-slate-950 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}

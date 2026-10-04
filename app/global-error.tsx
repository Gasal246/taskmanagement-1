"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <html lang="en"><body style={{ margin: 0, fontFamily: "system-ui", background: "#020617", color: "#f1f5f9" }}>
    <main role="alert" style={{ maxWidth: 480, margin: "15vh auto", padding: 24 }}>
      <h1>We couldn’t load your workspace</h1>
      <p>Please try again shortly. If the problem continues, check your connection.</p>
      <button type="button" onClick={reset} style={{ padding: "10px 16px", cursor: "pointer" }}>Try again</button>
    </main>
  </body></html>;
}

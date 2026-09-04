"use client";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  return (
    <html lang="en" className="dark">
      <body>
        <main style={{ minHeight: "100vh", background: "#07111f", color: "white", padding: 24 }}>
          <section style={{ maxWidth: 720 }}>
            <p style={{ textTransform: "uppercase", letterSpacing: 2, color: "#99f6e4" }}>
              DG Academy
            </p>
            <h1>Something needs attention</h1>
            <p style={{ color: "#cbd5e1", lineHeight: 1.7 }}>
              Refresh the app and try again. Contact support if the problem continues.
            </p>
            <pre style={{ whiteSpace: "pre-wrap", color: "#fecaca" }}>
              {error.message}
            </pre>
          </section>
        </main>
      </body>
    </html>
  );
}

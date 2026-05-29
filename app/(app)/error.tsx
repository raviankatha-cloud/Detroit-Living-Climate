"use client";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="hero-panel compact-hero">
      <div>
        <span className="eyebrow">Error</span>
        <h2>Something did not load cleanly.</h2>
        <p>The secure app shell is still available. Retry the page or check the server logs.</p>
      </div>
      <button className="button primary" type="button" onClick={reset}>
        Retry
      </button>
    </section>
  );
}

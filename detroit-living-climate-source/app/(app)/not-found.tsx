import Link from "next/link";

export default function NotFound() {
  return (
    <section className="hero-panel compact-hero">
      <div>
        <span className="eyebrow">Not found</span>
        <h2>This building or page is not available.</h2>
        <p>It may have been archived, or your account may not have access.</p>
      </div>
      <Link className="button primary" href="/dashboard">
        Back to overview
      </Link>
    </section>
  );
}

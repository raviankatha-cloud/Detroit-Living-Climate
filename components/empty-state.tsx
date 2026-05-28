import Link from "next/link";
import type { Route } from "next";

type EmptyStateProps = {
  eyebrow: string;
  title: string;
  body: string;
  href?: Route | `#${string}`;
  action?: string;
};

export function EmptyState({ eyebrow, title, body, href, action }: EmptyStateProps) {
  return (
    <section className="empty-state">
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      <p>{body}</p>
      {href && action ? (
        <Link className="button primary" href={href as Route}>
          {action}
        </Link>
      ) : null}
    </section>
  );
}

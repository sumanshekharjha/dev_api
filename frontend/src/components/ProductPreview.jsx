/**
 * ProductPreview
 * A bordered "window" used to present real product UI mockups
 * (API Vault, request builder, mock configuration, logs, etc).
 * `title` sits in a thin header bar, similar to a real application panel.
 */
export default function ProductPreview({ title, children, className = "" }) {
  return (
    <div className={`border border-ink bg-white ${className}`}>
      {title ? (
        <div className="flex items-center justify-between border-b border-ink px-4 py-2.5">
          <span className="font-mono text-xs tracking-wide text-ink/70">
            {title}
          </span>
        </div>
      ) : null}
      <div className="px-4 py-4 sm:px-5 sm:py-5">{children}</div>
    </div>
  );
}

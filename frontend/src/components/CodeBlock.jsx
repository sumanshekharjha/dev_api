/**
 * CodeBlock
 * A dark, developer-tool-styled block used for request/response examples
 * throughout the page. `title` is an optional small label shown in the
 * header bar (e.g. a method + path). `children` is the code content and
 * can include colored <span> elements for lightweight syntax emphasis.
 */
export default function CodeBlock({ title, children, className = "" }) {
  return (
    <div
      className={`border border-ink bg-ink text-cloud overflow-hidden ${className}`}
    >
      {title ? (
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
          <span className="font-mono text-xs tracking-wide text-white/60">
            {title}
          </span>
        </div>
      ) : null}
      <pre className="overflow-x-auto px-4 py-4 text-[13px] leading-6">
        <code className="font-mono whitespace-pre">{children}</code>
      </pre>
    </div>
  );
}

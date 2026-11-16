import ProductPreview from "../components/ProductPreview.jsx";

const logs = [
  { time: "10:42:11", method: "GET", path: "/users", status: 200 },
  { time: "10:42:18", method: "GET", path: "/users/12", status: 200 },
  { time: "10:42:25", method: "POST", path: "/users", status: 201 },
  { time: "10:42:31", method: "GET", path: "/users", status: 500 },
];

function statusColor(status) {
  if (status >= 500) return "text-red-500";
  if (status >= 400) return "text-red-500";
  return "text-green-600";
}

export default function RequestLogs() {
  return (
    <section className="border-t border-ink/10 bg-cloud">
      <div className="mx-auto max-w-content px-6 py-20 sm:px-8 sm:py-28">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            See what your mock receives
          </h2>
          <p className="mt-6 text-base leading-relaxed text-ink/70 sm:text-lg">
            Every call to a mock endpoint is logged, so it's clear what
            was requested, when, and what was sent back.
          </p>
        </div>

        <ProductPreview title="Request logs" className="mt-10">
          <div className="flex flex-col font-mono text-sm">
            {logs.map((log, index) => (
              <div
                key={`${log.time}-${index}`}
                className={`flex items-center gap-4 py-2.5 ${
                  index !== 0 ? "border-t border-ink/10" : ""
                }`}
              >
                <span className="w-20 shrink-0 text-ink/50">{log.time}</span>
                <span className="w-14 shrink-0 font-semibold text-ink/80">
                  {log.method}
                </span>
                <span className="flex-1 truncate text-ink">{log.path}</span>
                <span className={`shrink-0 font-semibold ${statusColor(log.status)}`}>
                  {log.status}
                </span>
              </div>
            ))}
          </div>
        </ProductPreview>
      </div>
    </section>
  );
}

import ProductPreview from "../components/ProductPreview.jsx";

export default function QuickTest() {
  return (
    <section className="border-t border-ink/10 bg-cloud">
      <div className="mx-auto max-w-content px-6 py-16 sm:px-8 sm:py-20">
        <div className="grid gap-10 md:grid-cols-2 md:items-center md:gap-16">
          <div className="max-w-md">
            <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              Testing a new API
            </h2>
            <p className="mt-4 text-base leading-relaxed text-ink/70">
              An API doesn't need to be saved before it can be tried. A
              quick test sends a single request and shows the response,
              with nothing kept afterward unless it's saved on purpose.
            </p>
          </div>

          <ProductPreview title="Quick Test">
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 font-mono text-sm">
              <span className="text-ink/50">Method:</span>
              <span className="font-semibold text-blue-500">GET</span>

              <span className="text-ink/50">URL:</span>
              <span className="text-ink">
                https://api.example.com/products
              </span>

              <span className="text-ink/50">Headers</span>
              <span className="text-ink/30">—</span>

              <span className="text-ink/50">Body</span>
              <span className="text-ink/30">—</span>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-ink/10 pt-4">
              <button
                type="button"
                className="border border-ink bg-ink px-4 py-1.5 text-xs font-semibold text-white"
              >
                Send
              </button>
              <span className="font-mono text-xs text-green-600">
                Response: 200 OK
              </span>
            </div>
          </ProductPreview>
        </div>
      </div>
    </section>
  );
}

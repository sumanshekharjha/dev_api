import ProductPreview from "../components/ProductPreview.jsx";
import CodeBlock from "../components/CodeBlock.jsx";

const tabs = ["Params", "Headers", "Body", "Auth"];

export default function TestWorkspace() {
  return (
    <section className="mx-auto max-w-content px-6 py-20 sm:px-8 sm:py-28">
      <div className="max-w-2xl">
        <h2 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Test an API
        </h2>
        <p className="mt-6 text-base leading-relaxed text-ink/70 sm:text-lg">
          A saved API can be opened and sent directly from the workspace,
          without switching to a separate tool.
        </p>
      </div>

      <ProductPreview title="Request builder" className="mt-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3 border border-ink/15 px-3 py-2">
            <span className="font-mono text-sm font-semibold text-blue-500">
              GET
            </span>
            <span className="font-mono text-sm text-ink/40">|</span>
            <span className="font-mono text-sm text-ink">
              https://api.example.com/users
            </span>
          </div>
          <button
            type="button"
            className="border border-ink bg-ink px-5 py-2 text-sm font-semibold text-white sm:ml-auto"
          >
            Send request
          </button>
        </div>

        <div className="mt-6 flex gap-6 border-b border-ink/10 font-mono text-sm text-ink/50">
          {tabs.map((tab, index) => (
            <span
              key={tab}
              className={`-mb-px border-b-2 pb-2 ${
                index === 0
                  ? "border-signal text-ink"
                  : "border-transparent"
              }`}
            >
              {tab}
            </span>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4 font-mono text-xs text-ink/50">
          <span className="text-green-600">200 OK</span>
          <span>124 ms</span>
          <span>2.4 KB</span>
        </div>

        <CodeBlock className="mt-3">
          {"{\n"}
          {"  "}"<span className="text-signal">users</span>": [...]{"\n"}
          {"}"}
        </CodeBlock>
      </ProductPreview>
    </section>
  );
}

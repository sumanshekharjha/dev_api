import ProductPreview from "../components/ProductPreview.jsx";
import CodeBlock from "../components/CodeBlock.jsx";

const errorCodes = ["400", "401", "404", "500"];

export default function MockConfiguration() {
  return (
    <section className="mx-auto max-w-content px-6 py-20 sm:px-8 sm:py-28">
      <div className="grid gap-12 md:grid-cols-2 md:gap-16">
        <div className="max-w-md">
          <h2 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Control the mock response
          </h2>
          <p className="mt-6 text-base leading-relaxed text-ink/70 sm:text-lg">
            A mock endpoint can be adjusted after it's created — the
            status code, response body, response delay, and how it should
            behave when simulating a failure.
          </p>
        </div>

        <ProductPreview title="Mock: /users">
          <div className="flex flex-col gap-5 font-mono text-sm">
            <div>
              <div className="text-ink/50">Status</div>
              <div className="mt-1.5 inline-block border border-ink/15 px-3 py-1 text-green-600">
                200
              </div>
            </div>

            <div>
              <div className="mb-1.5 text-ink/50">Response</div>
              <CodeBlock>
                {"{\n"}
                {"  "}"<span className="text-signal">users</span>": []{"\n"}
                {"}"}
              </CodeBlock>
            </div>

            <div>
              <div className="text-ink/50">Delay</div>
              <div className="mt-1.5 text-ink">500 ms</div>
            </div>

            <div>
              <div className="mb-1.5 text-ink/50">Error response</div>
              <div className="flex gap-2">
                {errorCodes.map((code) => (
                  <span
                    key={code}
                    className="border border-ink/15 px-2.5 py-1 text-ink/70"
                  >
                    {code}
                  </span>
                ))}
              </div>
            </div>

            <button
              type="button"
              className="mt-1 self-start border border-ink bg-signal px-5 py-1.5 text-xs font-semibold text-ink"
            >
              Save
            </button>
          </div>
        </ProductPreview>
      </div>
    </section>
  );
}

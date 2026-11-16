import ProductPreview from "../components/ProductPreview.jsx";

const endpoints = [
  { method: "GET", path: "/users" },
  { method: "GET", path: "/users/:id" },
  { method: "POST", path: "/users" },
];

const methodColor = {
  GET: "text-blue-500",
  POST: "text-green-600",
};

export default function ApiVault() {
  return (
    <section id="api-vault" className="border-t border-ink/10">
      <div className="mx-auto max-w-content px-6 py-20 sm:px-8 sm:py-28">
        <div className="grid gap-12 md:grid-cols-2 md:gap-16">
          <div className="max-w-md">
            <h2 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Save an API and use it again
            </h2>
            <p className="mt-6 text-base leading-relaxed text-ink/70 sm:text-lg">
              An API Vault entry can store an API's name, base URL,
              endpoints, HTTP method, authentication, headers, query
              parameters, request body and notes.
            </p>
            <p className="mt-4 text-base leading-relaxed text-ink/70 sm:text-lg">
              Related endpoints can be grouped into collections, so a
              whole integration stays organized in one place instead of
              being rebuilt from memory each time.
            </p>
          </div>

          <ProductPreview title="API Vault">
            <div className="font-mono text-sm">
              <div className="text-ink/50">Users</div>
              <div className="mt-2 flex flex-col gap-1.5 pl-3">
                {endpoints.map((endpoint) => (
                  <div
                    key={`${endpoint.method}-${endpoint.path}`}
                    className="flex items-center gap-3"
                  >
                    <span
                      className={`w-10 shrink-0 font-semibold ${
                        methodColor[endpoint.method]
                      }`}
                    >
                      {endpoint.method}
                    </span>
                    <span className="text-ink">{endpoint.path}</span>
                  </div>
                ))}
              </div>

              <div className="mt-5 text-ink/50">Authentication</div>
              <div className="mt-2 pl-3 text-ink">Bearer Token</div>

              <div className="mt-5 text-ink/50">Headers</div>
              <div className="mt-2 pl-3 text-ink">
                Accept: application/json
              </div>
            </div>
          </ProductPreview>
        </div>
      </div>
    </section>
  );
}

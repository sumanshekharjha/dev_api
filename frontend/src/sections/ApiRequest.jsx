import CodeBlock from "../components/CodeBlock.jsx";

const requestParts = [
  "HTTP method",
  "URL",
  "Headers",
  "Query parameters",
  "Request body",
  "Authentication",
];

export default function ApiRequest() {
  return (
    <section id="api-request" className="border-t border-ink/10 bg-cloud">
      <div className="mx-auto max-w-content px-6 py-20 sm:px-8 sm:py-28">
        <h2 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          How an API request works
        </h2>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-ink/70 sm:text-lg">
          A request carries everything the server needs to respond
          correctly. Depending on the API, that can include:
        </p>

        <ul className="mt-6 grid max-w-2xl grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-3">
          {requestParts.map((part) => (
            <li
              key={part}
              className="border-b border-ink/10 py-2 font-mono text-sm text-ink/80"
            >
              {part}
            </li>
          ))}
        </ul>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <CodeBlock title="Request">
            <span className="text-signal">GET</span>{" "}
            https://api.example.com/users?page=1
            {"\n\n"}
            Authorization: <span className="text-blue-300">Bearer token</span>
            {"\n"}
            Accept: <span className="text-blue-300">application/json</span>
          </CodeBlock>

          <CodeBlock title="Response">
            <span className="text-green-400">200 OK</span>
            {"\n\n"}
            {"{\n"}
            {"  "}"<span className="text-signal">users</span>": [{"\n"}
            {"    "}
            {"{\n"}
            {"      "}"<span className="text-signal">id</span>": 1,{"\n"}
            {"      "}"<span className="text-signal">name</span>": "
            <span className="text-blue-300">Alex</span>"{"\n"}
            {"    "}
            {"}\n"}
            {"  "}]{"\n"}
            {"}"}
          </CodeBlock>
        </div>
      </div>
    </section>
  );
}

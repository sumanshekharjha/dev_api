import ApiFlow from "../components/ApiFlow.jsx";

export default function MockApi() {
  return (
    <section className="border-t border-ink/10">
      <div className="mx-auto max-w-content px-6 py-20 sm:px-8 sm:py-28">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Create a mock from a response
          </h2>
          <p className="mt-6 text-base leading-relaxed text-ink/70 sm:text-lg">
            After an API has been tested successfully, its response can be
            turned into a mock endpoint — one that returns the same shape
            of data without calling the real API.
          </p>
        </div>

        <div className="mt-14 flex justify-center border border-ink/10 bg-cloud px-6 py-14">
          <ApiFlow
            steps={[
              { label: "REAL API", detail: "GET /users" },
              { label: "REQUEST" },
              { label: "RESPONSE", detail: "200 OK" },
              { label: "GENERATE MOCK" },
              { label: "MOCK ENDPOINT", detail: "GET /mock/users" },
            ]}
          />
        </div>
      </div>
    </section>
  );
}

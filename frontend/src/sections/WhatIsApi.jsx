import ApiFlow from "../components/ApiFlow.jsx";

export default function WhatIsApi() {
  return (
    <section id="what-is-an-api" className="mx-auto max-w-content px-6 py-20 sm:px-8 sm:py-28">
      <div className="grid gap-12 md:grid-cols-2 md:gap-16">
        <div>
          <h2 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            What is an API?
          </h2>
          <p className="mt-6 max-w-md text-base leading-relaxed text-ink/70 sm:text-lg">
            An API is a set of rules and protocols that allows different software applications or systems to communicate and exchange data with each other.
             It acts as an interface or bridge between a client and a server, allowing them to interact without needing to know how each system is internally implemented.
          </p>
           <p className="mt-4 max-w-md text-base leading-relaxed text-ink/70 sm:text-lg">
            The client such as a web browser, mobile application, or frontend sends a request to a server through an API.
            The server processes the request, performs the required operation, and returns a response
          </p>
          <p className="mt-4 max-w-md text-base leading-relaxed text-ink/70 sm:text-lg">
            Almost everything a modern application does — signing in,
            loading a feed, placing an order — happens through this
            exchange.
          </p>
        </div>

        <div className="flex items-center justify-center border border-ink/10 bg-cloud px-6 py-12">
          <ApiFlow
            steps={[
              { label: "CLIENT" },
              { label: "REQUEST" },
              { label: "API" },
              { label: "RESPONSE" },
              { label: "CLIENT" },
            ]}
          />
        </div>
      </div>
    </section>
  );
}

export default function WorkingWithApis() {
  return (
    <section className="mx-auto max-w-content px-6 py-20 sm:px-8 sm:py-28">
      <div className="max-w-2xl">
        <h2 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Working with APIs during development
        </h2>
        <p className="mt-6 text-base leading-relaxed text-ink/70 sm:text-lg">
          Building with APIs means repeatedly returning to the same
          details — URLs, headers, authentication, parameters, request
          bodies, and notes from the last time something worked or broke.
        </p>
        <p className="mt-4 text-base leading-relaxed text-ink/70 sm:text-lg">
          These details tend to scatter across browser tabs, chat
          messages, and half-remembered terminal history, which makes it
          easy to lose track of an API you already figured out once.
        </p>
        <p className="mt-4 text-base leading-relaxed text-ink/70 sm:text-lg">
          dev 404 brings these parts together in one workspace so a
          developer can save an API once and return to it whenever they
          need it.
        </p>
      </div>
    </section>
  );
}

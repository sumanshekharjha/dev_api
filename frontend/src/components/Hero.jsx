import { Link } from "react-router-dom";

export default function Hero() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink">
      {/* Background photograph: place the real asset at /public/images/hero-developer-room.jpg */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-ink bg-cover bg-center"
        style={{ backgroundImage: "url(/images/room.jpg)" }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-ink/80 via-ink/60 to-ink/85"
      />

      <div className="relative z-10 mx-auto flex max-w-content flex-col items-center px-6 py-32 text-center sm:px-8">
        <h1 className="font-display text-5xl font-bold uppercase leading-[1.05] tracking-tight text-white sm:text-6xl md:text-7xl">
              Request
              <br />
              <span className="inline-block mt-1 text-signal">Response</span>
              <br />
              <span className="inline-block mt-1">Receive</span>
            </h1>

        <p className="mt-8 max-w-md text-balance text-base text-white/80 sm:text-lg">
          Save, test and mock your APIs from one workspace.
        </p>

        <Link
          to="/login"
          className="mt-10 inline-block bg-signal px-8 py-3.5 text-sm font-semibold text-ink transition-opacity hover:opacity-90 sm:text-base"
        >
          Get Started
        </Link>
      </div>

      {/* Decorative alt text for assistive technology, since the photograph is a CSS background */}
      <span className="sr-only">
        A developer working at a desk in a home office filled with books,
        electronics and an old, forgotten storage vault in the corner.
      </span>
    </section>
  );
}

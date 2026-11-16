/**
 * ApiFlow
 * Renders a vertical sequence of steps connected by a yellow line,
 * used for the "what is an API" diagram and the mock-creation flow.
 * `steps` is an array of { label, detail } objects.
 */
export default function ApiFlow({ steps, className = "" }) {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      {steps.map((step, index) => (
        <div key={step.label} className="flex flex-col items-center">
          <div className="border border-ink px-5 py-2.5 text-center">
            <div className="font-mono text-sm font-semibold tracking-wide text-ink">
              {step.label}
            </div>
            {step.detail ? (
              <div className="mt-0.5 font-mono text-xs text-ink/50">
                {step.detail}
              </div>
            ) : null}
          </div>
          {index < steps.length - 1 ? (
            <div
              aria-hidden="true"
              className="my-1 h-8 w-px bg-signal sm:h-10"
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}

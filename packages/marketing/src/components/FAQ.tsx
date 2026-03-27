export interface FAQItem {
  question: string;
  answer: string;
}

export interface FAQProps {
  title?: string;
  description?: string;
  items: FAQItem[];
}

export function FAQ({
  title = "Frequently Asked Questions",
  description = "Can't find the answer you're looking for? Reach out to our support team.",
  items,
}: FAQProps) {
  return (
    <div className="mx-auto max-w-4xl font-sans">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
          {title}
        </h2>
        {description && (
          <p className="mt-4 text-lg text-slate-500 dark:text-slate-400">{description}</p>
        )}
      </div>

      <dl className="mt-8 divide-y divide-slate-200 dark:divide-slate-800">
        {items.map((item, index) => (
          <div key={index} className="py-6 first:pt-0 last:pb-0">
            <details className="group">
              <summary className="flex cursor-pointer items-center justify-between font-medium text-slate-900 dark:text-white list-none">
                <span className="text-lg">{item.question}</span>
                <span className="relative ml-4 shrink-0 transition-transform duration-300 group-open:-rotate-180">
                  <svg
                    className="h-6 w-6 text-slate-400 dark:text-slate-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </summary>
              <div className="prose prose-slate dark:prose-invert mt-4 pr-12 text-slate-500 dark:text-slate-400">
                {item.answer}
              </div>
            </details>
          </div>
        ))}
      </dl>
    </div>
  );
}

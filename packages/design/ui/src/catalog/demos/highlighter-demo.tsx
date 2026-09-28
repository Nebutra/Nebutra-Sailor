"use client";

import { Highlighter } from "@nebutra/ui/primitives";

export function HighlighterDemo() {
  return (
    <div className="max-w-3xl p-8 gap-12 text-lg leading-relaxed mx-auto flex w-full flex-col">
      <div>
        <h3 className="text-2xl font-bold mb-4">Annotate your text with style</h3>
        <p className="mb-4">
          Sometimes you need to draw attention to{" "}
          <Highlighter action="highlight" color="#fef08a" animationDuration={800} triggerOnView>
            specific words
          </Highlighter>{" "}
          in a paragraph to make sure the user reads them.
        </p>
        <p className="mb-4">
          Or you might want to show that something is{" "}
          <Highlighter action="strike-through" color="#f87171" strokeWidth={2} triggerOnView>
            no longer applicable
          </Highlighter>{" "}
          without actually removing the text.
        </p>
        <p className="mb-4">
          You can also{" "}
          <Highlighter
            action="underline"
            color="#60a5fa"
            strokeWidth={3}
            iterations={3}
            triggerOnView
          >
            underline key concepts
          </Highlighter>{" "}
          to give them emphasis, similar to what you would do with a pen in a book.
        </p>
        <p>
          For really important metrics, maybe you want to{" "}
          <Highlighter action="circle" color="#34d399" strokeWidth={2} padding={5} triggerOnView>
            circle
          </Highlighter>{" "}
          them.
        </p>
      </div>
    </div>
  );
}

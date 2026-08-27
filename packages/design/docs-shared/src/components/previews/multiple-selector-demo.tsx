import { MultipleSelector } from "@nebutra/ui/primitives";

export function MultipleSelectorDemo() {
  const OPTIONS = [
    { label: "next.js", value: "nextjs" },
    { label: "Vue", value: "vue" },
    { label: "Nuxt", value: "nuxt" },
    { label: "Svelte", value: "svelte" },
    { label: "SvelteKit", value: "sveltekit" },
    { label: "Remix", value: "remix" },
    { label: "Astro", value: "astro" },
    { label: "Angular", value: "angular" },
  ];

  return (
    <div className="max-w-sm p-8 gap-6 mx-auto flex h-[400px] w-full flex-col">
      <div className="space-y-2">
        <span className="text-sm font-medium">Frameworks</span>
        <MultipleSelector
          defaultOptions={OPTIONS}
          placeholder="Select frameworks..."
          emptyIndicator={
            <p className="text-lg leading-10 text-gray-600 dark:text-gray-400 text-center">
              No results found.
            </p>
          }
        />
      </div>

      <div className="space-y-2">
        <span className="text-sm font-medium">Creatable Frameworks</span>
        <MultipleSelector
          creatable
          defaultOptions={OPTIONS}
          placeholder="Select or create..."
          emptyIndicator={
            <p className="text-lg leading-10 text-gray-600 dark:text-gray-400 text-center">
              No results found.
            </p>
          }
        />
      </div>
    </div>
  );
}

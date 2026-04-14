import { Badge } from "@nebutra/ui/primitives";
import { defineStory } from "@/lib/story";

export const story = defineStory(import.meta.url, {
  Component: Badge,
  args: [
    {
      variant: "Default",
      initial: {
        children: "Badge",
      },
    },
    {
      variant: "Secondary",
      initial: {
        children: "Secondary",
      },
      fixed: {
        variant: "secondary",
      },
    },
    {
      variant: "Destructive",
      initial: {
        children: "Destructive",
      },
      fixed: {
        variant: "destructive",
      },
    },
    {
      variant: "Outline",
      initial: {
        children: "Outline",
      },
      fixed: {
        variant: "outline",
      },
    },
    {
      variant: "With Dot",
      initial: {
        children: "Status",
        dot: true,
      },
      fixed: {
        variant: "success",
      },
    },
  ],
});

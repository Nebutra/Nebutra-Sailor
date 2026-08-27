/**
 * Navigation Components
 *
 * Components for narrative UX and scroll-based navigation.
 * Implements the story progression system from DESIGN.md Section 11.2
 */

export {
  type ScrollSpyContextValue,
  ScrollSpyProvider,
  type ScrollSpyProviderProps,
  type SectionInfo,
  useRegisterSection,
  useScrollSpy,
} from "./ScrollSpyProvider";

export { StoryProgress, type StoryProgressProps } from "./StoryProgress";

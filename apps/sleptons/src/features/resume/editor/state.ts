import type { ResumeContentV1Input, ResumeSkillCategory } from "@nebutra/contracts/sleptons";
import type { FieldDef, ListSectionKey, ObjectSectionKey } from "./sections";
import { getSection } from "./sections";

/**
 * Pure, immutable editor state. `ResumeContentV1Input` (not the parsed output)
 * so the editor can hold partially-filled entries before they validate.
 */
export type EditorContent = ResumeContentV1Input;
export type ListItem = Record<string, unknown>;

export type EditorAction =
  | { type: "replace"; content: EditorContent }
  | { type: "setField"; section: ObjectSectionKey; key: string; value: unknown }
  | { type: "setItemField"; section: ListSectionKey; index: number; key: string; value: unknown }
  | { type: "addItem"; section: ListSectionKey }
  | { type: "removeItem"; section: ListSectionKey; index: number }
  | { type: "moveItem"; section: ListSectionKey; index: number; direction: -1 | 1 }
  | { type: "setSkills"; category: ResumeSkillCategory; values: string[] }
  | { type: "setInterests"; values: string[] };

export function emptyContent(name = ""): EditorContent {
  return { basic: { name }, objective: {} };
}

/** A new list item pre-shaped from the section's field definitions. */
export function emptyItem(fields: readonly FieldDef[]): ListItem {
  const item: ListItem = {};
  for (const f of fields) {
    if (f.type === "select" && f.options?.[0]) item[f.key] = f.options[0].value;
  }
  return item;
}

function normalise(value: unknown): unknown {
  if (typeof value === "string") return value === "" ? undefined : value;
  if (Array.isArray(value)) return value.length === 0 ? undefined : value;
  return value;
}

function listOf(state: EditorContent, section: ListSectionKey): ListItem[] {
  return (state[section] as ListItem[] | undefined) ?? [];
}

export function resumeReducer(state: EditorContent, action: EditorAction): EditorContent {
  switch (action.type) {
    case "replace":
      return action.content;

    case "setField":
      return {
        ...state,
        [action.section]: { ...state[action.section], [action.key]: normalise(action.value) },
      };

    case "setItemField": {
      const list = listOf(state, action.section);
      const next = list.map((item, i) =>
        i === action.index ? { ...item, [action.key]: normalise(action.value) } : item,
      );
      return { ...state, [action.section]: next };
    }

    case "addItem": {
      const def = getSection(action.section);
      const fields = def.kind === "list" ? def.fields : [];
      return { ...state, [action.section]: [...listOf(state, action.section), emptyItem(fields)] };
    }

    case "removeItem": {
      const next = listOf(state, action.section).filter((_, i) => i !== action.index);
      return { ...state, [action.section]: next.length ? next : undefined };
    }

    case "moveItem": {
      const list = listOf(state, action.section);
      const target = action.index + action.direction;
      if (target < 0 || target >= list.length) return state;
      const next = [...list];
      const a = next[action.index];
      const b = next[target];
      if (a === undefined || b === undefined) return state;
      next[action.index] = b;
      next[target] = a;
      return { ...state, [action.section]: next };
    }

    case "setSkills": {
      const skills = { ...(state.skills ?? {}), [action.category]: normalise(action.values) };
      const any = Object.values(skills).some((v) => Array.isArray(v) && v.length > 0);
      return { ...state, skills: any ? skills : undefined };
    }

    case "setInterests":
      return { ...state, interests: normalise(action.values) as string[] | undefined };

    default:
      return state;
  }
}

/** Human title for a list item, used in the item header. */
export function itemTitle(item: ListItem, titleKey: string, fallback: string): string {
  const v = item[titleKey];
  return typeof v === "string" && v.trim() ? v : fallback;
}

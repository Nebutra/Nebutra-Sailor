/**
 * Component reference, parsed from the pinned sources with the TypeScript compiler: the Vue
 * component's defineProps/withDefaults/defineEmits/defineSlots and the React wrapper's props.
 * Names, types, optionality and defaults are the source's; descriptions come from the source's
 * own JSDoc (Chinese) with English text kept in scripts/data/component-descriptions.json.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

export const VUE_COMPONENT = "packages/vue/src/components/KLineChart.vue";
export const REACT_COMPONENT = "packages/react/src/KLineChartWC.tsx";
export const WEB_COMPONENT = "packages/vue/src/web-component.ts";

function scriptSetup(file) {
  const text = readFileSync(file, "utf8");
  const match = text.match(/<script setup lang="ts">([\s\S]*?)<\/script>/);
  if (!match) throw new Error(`${file}: no <script setup lang="ts"> block`);
  return match[1];
}

function jsDoc(node, sourceFile) {
  const ranges = ts.getLeadingCommentRanges(sourceFile.text, node.pos) ?? [];
  const docs = ranges
    .map((r) => sourceFile.text.slice(r.pos, r.end))
    .filter((c) => c.startsWith("/**"))
    .map((c) =>
      c
        .replace(/^\/\*\*|\*\/$/g, "")
        .split("\n")
        .map((line) => line.replace(/^\s*\* ?/, "").trim())
        .filter((line) => line && !line.startsWith("@"))
        .join(" ")
        .trim(),
    );
  return docs.at(-1) ?? "";
}

function findCall(sourceFile, name) {
  let found;
  const visit = (node) => {
    if (found) return;
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === name
    ) {
      found = node;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  if (!found) throw new Error(`${name}() not found`);
  return found;
}

const text = (node, sf) => node.getText(sf).replace(/\s+/g, " ").trim();

export function readVueComponent(source) {
  const code = scriptSetup(resolve(source, VUE_COMPONENT));
  const sf = ts.createSourceFile("KLineChart.ts", code, ts.ScriptTarget.Latest, true);

  const defineProps = findCall(sf, "defineProps");
  const propsType = defineProps.typeArguments?.[0];
  if (!propsType || !ts.isTypeLiteralNode(propsType))
    throw new Error("defineProps<{...}> expected");
  const defaults = new Map();
  const withDefaults = findCall(sf, "withDefaults");
  const defaultsArg = withDefaults.arguments[1];
  if (defaultsArg && ts.isObjectLiteralExpression(defaultsArg)) {
    for (const property of defaultsArg.properties) {
      if (ts.isPropertyAssignment(property))
        defaults.set(text(property.name, sf), text(property.initializer, sf));
    }
  }
  const props = propsType.members.filter(ts.isPropertySignature).map((member) => ({
    name: text(member.name, sf),
    type: member.type ? text(member.type, sf) : "unknown",
    optional: Boolean(member.questionToken),
    default: defaults.get(text(member.name, sf)),
    sourceDescription: jsDoc(member, sf),
  }));

  const emitsType = findCall(sf, "defineEmits").typeArguments?.[0];
  const events = (emitsType && ts.isTypeLiteralNode(emitsType) ? emitsType.members : [])
    .filter(ts.isCallSignatureDeclaration)
    .map((signature) => {
      const [first, ...rest] = signature.parameters;
      const literal = first?.type && ts.isLiteralTypeNode(first.type) ? first.type.literal : null;
      if (!literal || !ts.isStringLiteral(literal))
        throw new Error("emit signature without a name");
      return {
        name: literal.text,
        args: rest.map((p) => ({
          name: text(p.name, sf),
          type: p.type ? text(p.type, sf) : "unknown",
        })),
      };
    });

  const slotsType = findCall(sf, "defineSlots").typeArguments?.[0];
  const slots = (slotsType && ts.isTypeLiteralNode(slotsType) ? slotsType.members : [])
    .filter(ts.isMethodSignature)
    .map((method) => ({
      name: text(method.name, sf).replace(/^['"]|['"]$/g, ""),
      props: method.parameters[0]?.type ? text(method.parameters[0].type, sf) : null,
      sourceDescription: jsDoc(method, sf),
    }));

  return { file: VUE_COMPONENT, props, events, slots };
}

export function readReactComponent(source) {
  const code = readFileSync(resolve(source, REACT_COMPONENT), "utf8");
  const sf = ts.createSourceFile("KLineChartWC.tsx", code, ts.ScriptTarget.Latest, true);
  const iface = sf.statements.find(
    (s) => ts.isInterfaceDeclaration(s) && s.name.text === "KLineChartWCProps",
  );
  if (!iface) throw new Error("KLineChartWCProps not found");
  const props = iface.members.filter(ts.isPropertySignature).map((member) => ({
    name: text(member.name, sf),
    type: member.type ? text(member.type, sf) : "unknown",
    optional: Boolean(member.questionToken),
  }));
  // Attribute and event names the wrapper actually syncs (syncAttribute / addEventListener calls).
  const attributes = [...code.matchAll(/syncAttribute\(el, '([a-z-]+)', props\.(\w+)\)/g)].map(
    (m) => ({ attribute: m[1], prop: m[2] }),
  );
  const listeners = [...code.matchAll(/addEventListener\('([a-z-]+)'/g)].map((m) => m[1]);
  return { file: REACT_COMPONENT, props, attributes, listeners };
}

export function readWebComponent(source) {
  const code = readFileSync(resolve(source, WEB_COMPONENT), "utf8");
  const tag = code.match(/customElements\.define\('([a-z-]+)'/)?.[1];
  if (!tag) throw new Error("customElements.define not found");
  const shadowRoot = /shadowRoot:\s*true/.test(code);
  return { file: WEB_COMPONENT, tag, shadowRoot };
}

export const kebab = (name) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

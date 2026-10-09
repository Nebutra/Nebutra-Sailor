/**
 * Integration snippets for the developers section. Each one uses only API the pinned chart source
 * exports: the Vue example is the README's, React wraps the `<kline-chart>` element
 * (packages/react/src/KLineChartWC.tsx), and the agent example mirrors how the Vue workbench adapts
 * the registry (packages/vue/src/features/agent/browser-agent/tools/impl/browser-tool-registry.ts).
 * developer-snippets.test.ts checks every imported name against the source. Code is not translated.
 */
export const SNIPPETS = [
  {
    id: "vue",
    label: "Vue",
    file: "Chart.vue",
    code: `<script setup lang="ts">
import { ref } from 'vue'
import { KlineChart, type CustomDataSource } from '@363045841yyt/klinechart'
import '@363045841yyt/klinechart/style.css'
import bars from './bars.json'

const theme = ref<'light' | 'dark'>('dark')
const data = ref<CustomDataSource>(bars as CustomDataSource)
</script>

<template>
  <KlineChart v-model:theme="theme" :custom-data="data" />
</template>`,
  },
  {
    id: "react",
    label: "React",
    file: "Chart.tsx",
    code: `import { KLineChartWC } from '@363045841yyt/klinechart-react'

export function Chart() {
  return (
    <KLineChartWC
      style={{ height: 480 }}
      initialZoomLevel={3}
      onZoomLevelChange={({ level }) => console.log('zoom', level)}
    />
  )
}`,
  },
  {
    id: "web-component",
    label: "Web Component",
    file: "index.html",
    code: `<script type="module">
  // Registers <kline-chart> (bundled from the Vue package).
  import '@363045841yyt/klinechart/web-component'
</script>

<kline-chart initial-zoom-level="3" style="display:block;height:480px"></kline-chart>`,
  },
  {
    id: "agent",
    label: "Agent tools",
    file: "agent-tools.ts",
    code: `import {
  createChartController,
  getRegisteredChartTools,
} from '@363045841yyt/klinechart-core/controllers'

const chart = await createChartController({ container, data })

// The same @Tool methods the interface calls: schema, safety level, one executor.
export const tools = getRegisteredChartTools().map((tool) => ({
  name: tool.config.name, // 'drawing_create', 'comparison_create', …
  description: tool.config.description,
  parameters: tool.config.parameters, // TypeBox, i.e. JSON Schema
  readOnly: tool.config.safety === 'read-only',
  run: (input: unknown, signal: AbortSignal) => {
    const host = chart.agent.toolHosts.find((h) => tool.owns(h)) ?? chart.agent
    return tool.execute(host, input, { signal, progress: () => {} })
  },
}))`,
  },
] as const;

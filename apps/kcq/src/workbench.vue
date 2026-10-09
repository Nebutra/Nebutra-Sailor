<!-- Host navigation shares the canonical toolbar; the chart owns the viewport. -->
<script setup lang="ts">
import { onMounted } from "vue";
import BalanceNoticeSurface from "./balance-notice-surface.vue";
import HeaderSurface from "./header-surface.vue";
import { scheduleScreenshotFont } from "./screenshot-font";
import SourceConnectionsSurface from "./source-connections-surface.vue";
import {
  AgentWorkbenchShell,
  KlineChart,
  useWorkbench,
  type WorkbenchProps,
} from "./use-workbench";

const props = defineProps<WorkbenchProps>();
const {
  connections,
  canManage,
  busy: connectionBusy,
  error: connectionError,
  save: saveConnection,
  remove: removeConnection,
  test: testConnection,
  initialize: refreshConnections,
} = props.marketConnections;
const {
  busy,
  wallet,
  lowBalance,
  refreshWallet,
  error,
  hasData,
  dataLoading,
  dataError,
  bridge,
  panelWidthStorage,
  signInUrl,
  switchWorkspace,
  signOut,
  onControllerReady,
  onThemeChange,
} = useWorkbench(props);

const origin = window.location.origin;
onMounted(() => scheduleScreenshotFont());
</script>
<template>
  <div class="workbench" :aria-busy="busy">
    <div v-if="error" role="alert" class="notice">{{ error }}</div>
    <BalanceNoticeSurface v-if="lowBalance" :origin="origin" :on-dismiss="() => (lowBalance = false)" />
    <main class="chart-area" :inert="busy || undefined" aria-label="图表与 Agent 工作台">
      <AgentWorkbenchShell :bridge="bridge" :panel-width-storage="panelWidthStorage" :initial-panel-open="false">
        <template #chart>
          <div class="chart-stage">
            <KlineChart @controller-ready="onControllerReady" @theme-change="onThemeChange">
              <template #source-management>
                <SourceConnectionsSurface :signed-in="Boolean(context)" :sign-in-url="signInUrl" :connections="connections" :can-manage="canManage" :busy="connectionBusy" :error="connectionError" :on-save="saveConnection" :on-remove="removeConnection" :on-test="testConnection" :on-retry="refreshConnections" />
              </template>
              <template #toolbar-start>
                <HeaderSurface :context="context" :busy="busy" :sign-in-url="signInUrl" :on-switch="switchWorkspace" :on-sign-out="signOut" :wallet="wallet" :on-wallet-open="refreshWallet" />
              </template>
            </KlineChart>
            <div v-if="!hasData" class="chart-empty" role="status">
              <h1>{{ dataLoading ? '正在加载行情' : dataError ? '行情暂时不可用' : '从工具栏选择商品' }}</h1>
              <p v-if="dataError">{{ dataError }}</p>
            </div>
          </div>
        </template>
      </AgentWorkbenchShell>
    </main>
  </div>
</template>

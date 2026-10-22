<!-- Host navigation shares the canonical toolbar; the chart owns the viewport. -->
<script setup lang="ts">
import { onMounted } from "vue";
import BalanceNoticeSurface from "./balance-notice-surface.vue";
import EmptySurface from "./empty-surface.vue";
import HeaderSurface from "./header-surface.vue";
import HelpSurface from "./help-surface.vue";
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
  hasSelection,
  chartReady,
  quickStart,
  shortcuts,
  retryChart,
  help,
  helpReturnFocus,
  openHelp,
  analyticsConsent,
  setAnalyticsConsent,
  diagnostics,
  bridge,
  panelWidthStorage,
  signInUrl,
  switchWorkspace,
  signOut,
  onControllerReady,
  onThemeChange,
} = useWorkbench(props);
const { loading: shortcutLoading, error: shortcutError } = quickStart;

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
                <HeaderSurface :context="context" :busy="busy" :sign-in-url="signInUrl" :on-switch="switchWorkspace" :on-sign-out="signOut" :wallet="wallet" :on-wallet-open="refreshWallet" :on-help="openHelp" />
              </template>
            </KlineChart>
            <EmptySurface v-if="!hasData" :data-loading="dataLoading" :shortcut-loading="shortcutLoading" :data-error="dataError" :shortcut-error="shortcutError" :chart-ready="chartReady" :has-selection="hasSelection" :shortcuts="shortcuts" :on-select="quickStart.select" :on-cancel="quickStart.cancel" :on-retry="retryChart" :on-help="(target) => openHelp('guide', target)" />
          </div>
        </template>
      </AgentWorkbenchShell>
    </main>
    <HelpSurface :section="help" :return-focus="helpReturnFocus" :signed-in="Boolean(context)" :sign-in-url="signInUrl" :analytics-consent="analyticsConsent" :diagnostics="diagnostics" :on-close="() => (help = null)" :on-consent-change="setAnalyticsConsent" />
  </div>
</template>

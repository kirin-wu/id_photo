<template>
  <main class="eni-tool">
    <section class="eni-toolbar" aria-label="ENI 查询下载助手工具栏">
      <div class="eni-heading">
        <h1>ENI 查询下载助手</h1>
        <span :class="['eni-status', frameReady ? 'ready' : 'loading']">
          {{ statusText }}
        </span>
      </div>

      <div class="eni-actions">
        <button class="eni-icon-btn" type="button" title="刷新" @click="reloadFrame">
          <RefreshCw :size="18" />
        </button>
        <button class="eni-icon-btn" type="button" title="全屏" @click="openFullscreen">
          <Maximize2 :size="18" />
        </button>
        <a class="eni-link-btn" :href="targetUrl" target="_blank" rel="noopener noreferrer">
          <ExternalLink :size="17" />
          <span>外部打开</span>
        </a>
      </div>
    </section>

    <section class="eni-frame-panel">
      <iframe
        v-if="canEmbed"
        :key="frameKey"
        class="eni-frame"
        :src="targetUrl"
        title="ENI 查询下载助手"
        referrerpolicy="no-referrer"
        @load="handleFrameLoad"
      ></iframe>

      <div v-if="showFallback" class="eni-fallback">
        <h2>当前窗口无法内嵌打开</h2>
        <p>{{ fallbackText }}</p>
        <a class="eni-primary-link" :href="targetUrl" target="_blank" rel="noopener noreferrer">
          <ExternalLink :size="18" />
          <span>打开 ENI 查询下载助手</span>
        </a>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { ExternalLink, Maximize2, RefreshCw } from "lucide-vue-next";

const targetUrl = "http://103.236.94.102:8000/";

const frameKey = ref(0);
const frameReady = ref(false);
const timedOut = ref(false);
let loadTimer = null;

const isHttpsPage = window.location.protocol === "https:";
const isHttpTarget = targetUrl.startsWith("http:");
const canEmbed = !(isHttpsPage && isHttpTarget);

const statusText = computed(() => {
  if (!canEmbed) return "需外部打开";
  return frameReady.value ? "已连接" : "加载中";
});

const showFallback = computed(() => !canEmbed || timedOut.value);

const fallbackText = computed(() => {
  if (!canEmbed) {
    return "当前页面是 HTTPS，目标服务是 HTTP，浏览器会阻止内嵌。";
  }
  return "服务可能暂时无法在内嵌窗口中响应。";
});

function startLoadTimer() {
  clearTimeout(loadTimer);
  timedOut.value = false;
  if (!canEmbed) return;
  loadTimer = setTimeout(() => {
    if (!frameReady.value) {
      timedOut.value = true;
    }
  }, 6000);
}

function handleFrameLoad() {
  frameReady.value = true;
  timedOut.value = false;
  clearTimeout(loadTimer);
}

function reloadFrame() {
  frameReady.value = false;
  frameKey.value += 1;
  startLoadTimer();
}

function openFullscreen() {
  window.open(targetUrl, "_blank", "noopener,noreferrer");
}

onMounted(() => {
  startLoadTimer();
});

onBeforeUnmount(() => {
  clearTimeout(loadTimer);
});
</script>

<style scoped>
.eni-tool {
  width: min(1280px, 100%);
  min-height: calc(100vh - 104px);
  margin: 0 auto;
  display: grid;
  grid-template-rows: auto minmax(520px, 1fr);
  gap: 14px;
}

.eni-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 16px;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 8px;
  box-shadow: var(--shadow);
}

.eni-heading {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.eni-heading h1 {
  margin: 0;
  font-size: 18px;
  line-height: 1.2;
}

.eni-status {
  flex: 0 0 auto;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.eni-status.ready {
  background: #dcfce7;
  color: #166534;
}

.eni-status.loading {
  background: #f1f5f9;
  color: #475569;
}

.eni-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.eni-icon-btn,
.eni-link-btn,
.eni-primary-link {
  min-height: 38px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
  color: var(--text);
  cursor: pointer;
  text-decoration: none;
  font-weight: 700;
}

.eni-icon-btn {
  width: 38px;
  display: grid;
  place-items: center;
}

.eni-link-btn,
.eni-primary-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 13px;
}

.eni-icon-btn:hover,
.eni-link-btn:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.eni-frame-panel {
  position: relative;
  min-height: 520px;
  overflow: hidden;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 8px;
  box-shadow: var(--shadow);
}

.eni-frame {
  display: block;
  width: 100%;
  height: 100%;
  min-height: calc(100vh - 174px);
  border: 0;
  background: #fff;
}

.eni-fallback {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 12px;
  padding: 24px;
  background: rgba(248, 250, 252, 0.96);
  text-align: center;
}

.eni-fallback h2 {
  margin: 0;
  font-size: 20px;
}

.eni-fallback p {
  max-width: 520px;
  margin: 0;
  color: var(--muted);
}

.eni-primary-link {
  min-height: 42px;
  padding: 0 16px;
  border-color: var(--primary);
  background: var(--primary);
  color: #fff;
}

.eni-primary-link:hover {
  background: #1d4ed8;
}

@media (max-width: 720px) {
  .eni-tool {
    min-height: calc(100vh - 88px);
    grid-template-rows: auto minmax(480px, 1fr);
  }

  .eni-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .eni-heading {
    justify-content: space-between;
  }

  .eni-actions {
    display: grid;
    grid-template-columns: 38px 38px 1fr;
  }

  .eni-link-btn {
    width: 100%;
  }

  .eni-frame,
  .eni-frame-panel {
    min-height: calc(100vh - 198px);
  }
}
</style>

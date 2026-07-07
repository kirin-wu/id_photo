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
        :key="frameKey"
        class="eni-frame"
        :src="targetUrl"
        title="ENI 查询下载助手"
        referrerpolicy="no-referrer"
        @load="handleFrameLoad"
      ></iframe>

      <div v-if="!frameReady" class="eni-loading" aria-live="polite">
        <div class="eni-loading-card">
          <div class="eni-loader" aria-hidden="true">
            <span></span>
          </div>
          <div class="eni-loading-copy">
            <strong>{{ loadingTitle }}</strong>
            <p>{{ loadingMessage }}</p>
          </div>
          <div class="eni-loading-bar" aria-hidden="true">
            <span></span>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { ExternalLink, Maximize2, RefreshCw } from "lucide-vue-next";

const targetUrl = "https://eni.renhe.fun/";

const frameKey = ref(0);
const frameReady = ref(false);
const redirecting = ref(false);
let loadTimer = null;

const statusText = computed(() => {
  if (redirecting.value) {
    return "跳转中";
  }
  return frameReady.value ? "已连接" : "加载中";
});

const loadingTitle = computed(() => {
  return redirecting.value ? "正在跳转到 ENI 服务" : "正在连接 ENI 服务";
});

const loadingMessage = computed(() => {
  return redirecting.value
    ? "内嵌加载超时，正在使用当前窗口打开。"
    : "请稍候，若 6 秒内未响应将自动跳转。";
});

function startLoadTimer() {
  clearTimeout(loadTimer);
  redirecting.value = false;
  loadTimer = setTimeout(() => {
    if (!frameReady.value) {
      redirecting.value = true;
      window.location.assign(targetUrl);
    }
  }, 6000);
}

function handleFrameLoad() {
  frameReady.value = true;
  redirecting.value = false;
  clearTimeout(loadTimer);
}

function reloadFrame() {
  frameReady.value = false;
  redirecting.value = false;
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
.eni-link-btn {
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

.eni-link-btn {
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

.eni-loading {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  padding: 24px;
  background:
    radial-gradient(circle at 30% 20%, rgba(59, 130, 246, 0.16), transparent 34%),
    radial-gradient(circle at 72% 70%, rgba(20, 184, 166, 0.14), transparent 30%),
    linear-gradient(135deg, rgba(248, 250, 252, 0.96), rgba(255, 255, 255, 0.9));
  backdrop-filter: blur(8px);
  text-align: center;
}

.eni-loading-card {
  width: min(380px, calc(100vw - 64px));
  display: grid;
  justify-items: center;
  gap: 14px;
  padding: 28px;
  border: 1px solid rgba(203, 213, 225, 0.78);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 18px 60px rgba(15, 23, 42, 0.14);
}

.eni-loader {
  width: 64px;
  height: 64px;
  position: relative;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background:
    conic-gradient(from 0deg, #2563eb, #14b8a6, #f59e0b, #2563eb);
  animation: eni-spin 1s linear infinite;
}

.eni-loader::after {
  content: "";
  position: absolute;
  inset: 8px;
  border-radius: 50%;
  background: #fff;
}

.eni-loader span {
  width: 16px;
  height: 16px;
  position: relative;
  z-index: 1;
  border-radius: 50%;
  background: #2563eb;
  box-shadow: 0 0 0 8px rgba(37, 99, 235, 0.12);
  animation: eni-pulse 1.1s ease-in-out infinite;
}

.eni-loading-copy {
  display: grid;
  gap: 6px;
}

.eni-loading-copy strong {
  color: var(--text);
  font-size: 18px;
  line-height: 1.25;
}

.eni-loading-copy p {
  margin: 0;
  color: var(--muted);
  line-height: 1.6;
}

.eni-loading-bar {
  width: 100%;
  height: 4px;
  overflow: hidden;
  border-radius: 999px;
  background: #e2e8f0;
}

.eni-loading-bar span {
  display: block;
  width: 42%;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #2563eb, #14b8a6, #f59e0b);
  animation: eni-slide 1.25s ease-in-out infinite;
}

@keyframes eni-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes eni-pulse {
  50% {
    transform: scale(0.72);
    box-shadow: 0 0 0 14px rgba(20, 184, 166, 0.12);
  }
}

@keyframes eni-slide {
  0% {
    transform: translateX(-120%);
  }

  100% {
    transform: translateX(240%);
  }
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

  .eni-loading-card {
    width: min(340px, calc(100vw - 40px));
    padding: 24px 18px;
  }
}
</style>

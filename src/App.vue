<template>
  <div class="app-shell">
    <!-- 工具页面：显示返回栏 -->
    <header v-if="activeTool" class="tool-topbar">
      <button class="back-btn" type="button" @click="go('/')">
        ← 工具总览
      </button>
      <span class="tool-title">{{ activeTool.title }}</span>
    </header>

    <HomeView
      v-if="!activeTool"
      :tools="tools"
      :categories="toolCategories"
      @navigate="go"
    />
    <component :is="activeTool.component" v-else />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watchEffect } from "vue";
import HomeView from "./views/HomeView.vue";
import { findToolByPath, normalizePath, toolCategories, tools } from "./tools/registry";

/* ---------- 路由 ---------- */

const currentPath = ref(normalizePath(window.location.pathname));
const activeTool = computed(() => findToolByPath(currentPath.value));

function syncPath() {
  currentPath.value = normalizePath(window.location.pathname);
}

function go(pathname) {
  const nextPath = normalizePath(pathname);
  if (normalizePath(window.location.pathname) !== nextPath) {
    window.history.pushState({}, "", nextPath);
  }
  currentPath.value = nextPath;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

watchEffect(() => {
  document.title = activeTool.value ? `${activeTool.value.title} - 办公工具箱` : "办公工具箱";
});

onMounted(() => {
  window.addEventListener("popstate", syncPath);
});

onBeforeUnmount(() => {
  window.removeEventListener("popstate", syncPath);
});
</script>

<style>
/* 全局 app 外壳样式 — 不 scoped，让子组件可以继承 */
.app-shell {
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  min-height: calc(100vh - 32px);
  display: grid;
  gap: 16px;
  padding: 0 24px;
}

@media (max-width: 640px) {
  .app-shell {
    padding: 0 12px;
    gap: 12px;
  }
}

.tool-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 8px;
  box-shadow: var(--shadow);
}

.back-btn {
  border: 0;
  background: transparent;
  color: var(--primary);
  font-weight: 700;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 6px;
}

.back-btn:hover {
  background: #edf4ff;
}

.tool-title {
  font-weight: 700;
  font-size: 16px;
}

@media (max-width: 760px) {
  .tool-topbar {
    flex-wrap: wrap;
    gap: 8px;
  }
}
</style>

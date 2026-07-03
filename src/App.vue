<template>
  <div class="route-shell">
    <aside class="side-tabs">
      <div class="side-brand">
        <strong>证件照工具</strong>
        <span>本地图片处理</span>
      </div>

      <nav class="tab-list" aria-label="功能切换" role="tablist" aria-orientation="vertical">
        <button
          v-for="feature in features"
          :key="feature.path"
          class="side-tab"
          :class="{ active: currentPath === feature.path }"
          type="button"
          role="tab"
          :aria-selected="currentPath === feature.path"
          @click="go(feature.path)"
        >
          <span class="tab-mark">{{ feature.mark }}</span>
          <span class="tab-copy">
            <strong>{{ feature.label }}</strong>
            <small>{{ feature.description }}</small>
          </span>
        </button>
      </nav>
    </aside>

    <section class="route-main" role="tabpanel">
      <component :is="activeFeature.component" />
    </section>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import A4ImageComposerView from "./views/A4ImageComposerView.vue";
import IdPhotoView from "./views/IdPhotoView.vue";

const features = [
  {
    path: "/",
    label: "一寸照",
    description: "拍照、裁切、换底色",
    mark: "1",
    component: IdPhotoView,
  },
  {
    path: "/a4-image",
    label: "A4 合图",
    description: "双图排版、打印导出",
    mark: "A4",
    component: A4ImageComposerView,
  },
];

const currentPath = ref(normalizePath(window.location.pathname));
const activeFeature = computed(() => features.find((feature) => feature.path === currentPath.value) ?? features[0]);

function normalizePath(pathname) {
  return pathname.replace(/\/+$/, "") || "/";
}

function syncPath() {
  currentPath.value = normalizePath(window.location.pathname);
}

function go(pathname) {
  if (normalizePath(window.location.pathname) === pathname) return;
  window.history.pushState({}, "", pathname);
  syncPath();
}

onMounted(() => {
  window.addEventListener("popstate", syncPath);
});

onBeforeUnmount(() => {
  window.removeEventListener("popstate", syncPath);
});
</script>

<style scoped>
.route-shell {
  width: min(1220px, 100%);
  min-height: calc(100vh - 36px);
  margin: 0 auto;
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.side-tabs {
  position: sticky;
  top: 18px;
  display: grid;
  gap: 14px;
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #fff;
  box-shadow: var(--shadow);
}

.side-brand {
  display: grid;
  gap: 3px;
  padding: 2px 2px 8px;
  border-bottom: 1px solid var(--line);
}

.side-brand strong {
  font-size: 18px;
  line-height: 1.2;
}

.side-brand span,
.side-tab small {
  color: var(--muted);
}

.tab-list {
  display: grid;
  gap: 8px;
}

.side-tab {
  width: 100%;
  min-height: 66px;
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  padding: 10px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #f8fafc;
  color: var(--text);
  text-align: left;
  cursor: pointer;
}

.side-tab:hover {
  border-color: #b8c4d6;
}

.side-tab.active {
  border-color: var(--primary);
  background: #eef4ff;
}

.tab-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 8px;
  background: #e2e8f0;
  color: var(--text);
  font-weight: 700;
}

.side-tab.active .tab-mark {
  background: var(--primary);
  color: #fff;
}

.tab-copy {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.tab-copy strong,
.tab-copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.route-main {
  min-width: 0;
}

@media (max-width: 640px) {
  .route-shell {
    min-height: 100vh;
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .side-tabs {
    position: static;
  }

  .tab-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .side-tab {
    min-height: 58px;
    grid-template-columns: 32px minmax(0, 1fr);
  }

  .tab-mark {
    width: 32px;
    height: 32px;
  }
}
</style>

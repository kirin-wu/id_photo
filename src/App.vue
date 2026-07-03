<template>
  <div class="route-shell">
    <nav class="top-nav" aria-label="工具导航">
      <a href="/" :class="{ active: currentPath === '/' }" @click.prevent="go('/')">一寸照</a>
      <a href="/a4-image" :class="{ active: currentPath === '/a4-image' }" @click.prevent="go('/a4-image')">A4 合图</a>
    </nav>

    <A4ImageComposerView v-if="currentPath === '/a4-image'" />
    <IdPhotoView v-else />
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";
import A4ImageComposerView from "./views/A4ImageComposerView.vue";
import IdPhotoView from "./views/IdPhotoView.vue";

const currentPath = ref(normalizePath(window.location.pathname));

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
  min-height: 100%;
}

.top-nav {
  width: min(980px, 100%);
  margin: 0 auto 14px;
  display: flex;
  gap: 8px;
}

.top-nav a {
  display: inline-flex;
  align-items: center;
  min-height: 38px;
  padding: 8px 12px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #fff;
  color: var(--text);
  text-decoration: none;
}

.top-nav a.active {
  border-color: var(--primary);
  background: var(--primary);
  color: #fff;
}

@media (max-width: 640px) {
  .top-nav {
    margin-bottom: 12px;
  }

  .top-nav a {
    flex: 1;
    justify-content: center;
  }
}
</style>

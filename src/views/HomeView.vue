<template>
  <section class="home-view">
    <h1 class="title">办公工具箱</h1>

    <div class="tool-grid">
      <button
        v-for="tool in tools"
        :key="tool.id"
        class="tool-card"
        type="button"
        @click="$emit('navigate', tool.path)"
      >
        <span class="card-icon">
          <component :is="iconMap[tool.icon]" :size="24" />
        </span>
        <span class="card-name">{{ tool.title }}</span>
        <span class="card-desc">{{ tool.description }}</span>
      </button>
    </div>
  </section>
</template>

<script setup>
import { Binary, Calculator, Camera, Cpu, Images, Languages, Package, Search } from "lucide-vue-next";

const iconMap = {
  binary: Binary,
  calculator: Calculator,
  camera: Camera,
  cpu: Cpu,
  images: Images,
  languages: Languages,
  package: Package,
  search: Search,
};

defineProps({
  tools: { type: Array, required: true },
  categories: { type: Array, required: true },
});

defineEmits(["navigate"]);
</script>

<style scoped>
.home-view {
  padding-top: 40px;
}

.title {
  margin: 0 0 28px;
  font-size: 24px;
  font-weight: 700;
  text-align: center;
}

.tool-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

.tool-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 28px 20px 24px;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 14px;
  text-align: center;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
}

.tool-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
  border-color: transparent;
}

.card-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: linear-gradient(135deg, #eef2ff, #e0e7ff);
  color: var(--primary);
}

.card-name {
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
}

.card-desc {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.5;
}

@media (max-width: 640px) {
  .home-view {
    padding-top: 24px;
  }

  .title {
    font-size: 20px;
    margin-bottom: 20px;
  }

  .tool-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .tool-card {
    padding: 18px 16px;
  }

  .card-icon {
    width: 40px;
    height: 40px;
  }

  .card-name {
    font-size: 15px;
  }
}
</style>

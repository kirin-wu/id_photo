<template>
  <main class="eni-tool">
    <section class="eni-panel">
      <div class="eni-body">
        <Search :size="48" class="eni-logo" />
        <h1>ENI 查询下载助手</h1>
        <p>点击下方按钮，在新窗口打开 ENI 查询下载服务。</p>
        <a class="eni-btn" :href="targetUrl">
          <ExternalLink :size="18" />
          <span>打开 ENI 查询下载助手</span>
        </a>
      </div>
    </section>
  </main>
</template>

<script setup>
import { ExternalLink, Search } from "lucide-vue-next";

const targetUrl = "http://103.236.94.102:8000/";
</script>

<style scoped>
.eni-tool {
  width: min(720px, 100%);
  min-height: calc(100vh - 104px);
  margin: 0 auto;
  display: grid;
  place-items: center;
}

.eni-panel {
  width: 100%;
  padding: 48px 24px;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 14px;
  box-shadow: var(--shadow);
  text-align: center;
}

.eni-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.eni-logo {
  color: var(--primary);
  opacity: 0.7;
}

.eni-body h1 {
  margin: 0;
  font-size: 22px;
}

.eni-body p {
  margin: 0;
  color: var(--muted);
  max-width: 380px;
}

.eni-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 48px;
  padding: 0 24px;
  margin-top: 8px;
  border-radius: 10px;
  background: var(--primary);
  color: #fff;
  font-weight: 700;
  font-size: 15px;
  text-decoration: none;
  transition: background 0.2s;
}

.eni-btn:hover {
  background: #1d4ed8;
}

@media (max-width: 640px) {
  .eni-tool {
    min-height: calc(100vh - 88px);
  }

  .eni-panel {
    padding: 36px 20px;
  }
}
</style>

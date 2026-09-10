<template>
  <main class="ethercat-tool">
    <section class="reference-header panel">
      <div class="eyebrow"><Network :size="18" /><span>ETHERCAT / CiA 402</span></div>
      <h1>EtherCAT 常用对象速查</h1>
      <p>以 PLC / 主站视角区分输入与输出，查看伺服驱动器常用对象。</p>
    </section>

    <section class="direction-cards" aria-label="PDO 数据方向">
      <article class="direction-card output-card">
        <div class="direction-heading"><h2>主站输出</h2><span>驱动器 RxPDO</span></div>
        <p class="data-flow">PLC / 主站 <ArrowRight :size="20" aria-hidden="true" /> 伺服驱动器</p>
        <p>主站发送指令，驱动器接收：控制字、目标位置、目标速度等。</p>
      </article>
      <article class="direction-card input-card">
        <div class="direction-heading"><h2>主站输入</h2><span>驱动器 TxPDO</span></div>
        <p class="data-flow">伺服驱动器 <ArrowRight :size="20" aria-hidden="true" /> PLC / 主站</p>
        <p>驱动器发送反馈，主站接收：状态字、实际位置、实际速度等。</p>
      </article>
    </section>

    <section class="objects-panel panel" aria-labelledby="objects-title">
      <div class="table-toolbar">
        <h2 id="objects-title">常用对象</h2>
        <label class="search-field">
          <Search :size="18" aria-hidden="true" />
          <input v-model="query" type="search" aria-label="搜索对象索引或名称" placeholder="搜索 603F、6041、速度…" autocomplete="off" />
        </label>
      </div>
      <div class="filter-bar">
        <div class="direction-filter" role="group" aria-label="按主站方向筛选">
          <button v-for="option in filters" :key="option.value" type="button" :class="{ active: direction === option.value }" :aria-pressed="direction === option.value" @click="setDirection(option.value)">
            {{ option.label }}
          </button>
        </div>
        <span class="result-count" role="status">共 {{ filteredObjects.length }} 项</span>
      </div>
      <div class="table-scroll" role="region" aria-label="CiA 402 常用对象表，可横向滚动" tabindex="0">
        <table>
          <thead><tr><th scope="col">索引</th><th scope="col">对象名称</th><th scope="col">主站方向</th><th scope="col">PDO 方向¹</th><th scope="col">含义 / 用途</th></tr></thead>
          <tbody>
            <tr v-for="object in pagedObjects" :key="object.index">
              <td><code>{{ object.index }}</code></td>
              <td><strong>{{ object.name }}</strong><span class="english-name">{{ object.english }}</span></td>
              <td><span class="direction-badge" :class="object.direction">{{ object.direction === 'output' ? '主站输出' : '主站输入' }}</span></td>
              <td>{{ object.pdo }}</td>
              <td>{{ object.description }}</td>
            </tr>
            <tr v-if="!filteredObjects.length"><td colspan="5" class="empty-state">没有匹配的对象，请尝试其他索引、名称或方向。</td></tr>
          </tbody>
        </table>
      </div>
      <nav v-if="totalPages > 1" class="pagination" aria-label="对象表分页">
        <button class="page-button" type="button" title="上一页" aria-label="上一页" :disabled="currentPage === 1" @click="currentPage -= 1">
          <ChevronLeft :size="18" />
        </button>
        <span>第 {{ currentPage }} / {{ totalPages }} 页</span>
        <button class="page-button" type="button" title="下一页" aria-label="下一页" :disabled="currentPage === totalPages" @click="currentPage += 1">
          <ChevronRight :size="18" />
        </button>
      </nav>
      <p class="table-note">¹ PDO 方向表示对象映射后的数据流向，不代表设备默认已映射或一定支持映射。索引使用十六进制表示。</p>
    </section>

    <section class="notes-panel panel" aria-labelledby="notes-title">
      <h2 id="notes-title">怎么理解 PDO 和 SDO？</h2>
      <dl>
        <div><dt>Rx / Tx 以驱动器为参照</dt><dd>Rx 是从站接收，对应主站输出；Tx 是从站发送，对应主站输入。上表统一采用主站视角。</dd></div>
        <div><dt>PDO 周期交换，SDO 按需读写</dt><dd>PDO 常用于周期交换控制与反馈数据；SDO 通过索引和子索引访问参数。同一个对象可能同时支持 SDO 访问和 PDO 映射，SDO 不固定属于输入或输出。</dd></div>
        <div><dt>0x603F 是错误码</dt><dd>可通过 SDO 按需读取；如果驱动器支持并配置了映射，也可通过 TxPDO 周期反馈。它不是控制字。</dd></div>
        <div><dt>以设备 ESI 文件和手册为准</dt><dd>CiA 402 定义对象的标准含义。实际支持的对象、读写权限、PDO 映射、默认布局以及数值单位和缩放，需要核对具体驱动器。</dd></div>
      </dl>
    </section>
  </main>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { ArrowRight, ChevronLeft, ChevronRight, Network, Search } from "lucide-vue-next";

const query = ref("");
const direction = ref("all");
const currentPage = ref(1);
const pageSize = 10;
const filters = [
  { value: "all", label: "全部对象" },
  { value: "output", label: "主站输出 · RxPDO" },
  { value: "input", label: "主站输入 · TxPDO" },
];
const objects = [
  { index: "0x6040", name: "控制字", english: "Controlword", direction: "output", pdo: "RxPDO", description: "请求使能、停机、故障复位。" },
  { index: "0x6060", name: "运行模式设置", english: "Modes of operation", direction: "output", pdo: "RxPDO", description: "请求位置、速度、转矩等运行模式。" },
  { index: "0x607A", name: "目标位置", english: "Target position", direction: "output", pdo: "RxPDO", description: "主站下发的位置指令。" },
  { index: "0x60FF", name: "目标速度", english: "Target velocity", direction: "output", pdo: "RxPDO", description: "主站下发的速度指令。" },
  { index: "0x6071", name: "目标转矩", english: "Target torque", direction: "output", pdo: "RxPDO", description: "主站下发的转矩指令。" },
  { index: "0x6041", name: "状态字", english: "Statusword", direction: "input", pdo: "TxPDO", description: "反馈驱动器的使能、运行、故障等状态。" },
  { index: "0x6061", name: "运行模式显示", english: "Modes of operation display", direction: "input", pdo: "TxPDO", description: "反馈驱动器实际采用的运行模式。" },
  { index: "0x6064", name: "实际位置", english: "Position actual value", direction: "input", pdo: "TxPDO", description: "驱动器的位置反馈。" },
  { index: "0x606C", name: "实际速度", english: "Velocity actual value", direction: "input", pdo: "TxPDO", description: "驱动器的速度反馈，单位与缩放以手册为准。" },
  { index: "0x6077", name: "实际转矩", english: "Torque actual value", direction: "input", pdo: "TxPDO", description: "驱动器的转矩反馈。" },
  { index: "0x603F", name: "错误码", english: "Error code", direction: "input", pdo: "TxPDO（若支持）", description: "查看故障原因；也可通过 SDO 按需读取。" },
];
const filteredObjects = computed(() => {
  const keywords = query.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return objects.filter((object) => {
    const matchesDirection = direction.value === "all" || direction.value === object.direction;
    const content = `${object.index} ${object.name} ${object.english} ${object.pdo} ${object.description}`.toLowerCase();
    return matchesDirection && keywords.every((keyword) => content.includes(keyword));
  });
});
const totalPages = computed(() => Math.max(1, Math.ceil(filteredObjects.value.length / pageSize)));
const pagedObjects = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  return filteredObjects.value.slice(start, start + pageSize);
});

watch([query, direction], () => {
  currentPage.value = 1;
});

function setDirection(value) {
  direction.value = value;
}
</script>

<style scoped>
.ethercat-tool { width: min(1120px, 100%); min-width: 0; margin: 0 auto; display: grid; align-content: start; gap: 16px; padding-bottom: 24px; }
.panel { min-width: 0; background: var(--panel); border: 1px solid var(--line); border-radius: 8px; box-shadow: var(--shadow); }
.reference-header { padding: 22px; }
.eyebrow { display: flex; align-items: center; gap: 7px; color: #0f766e; font-size: 12px; font-weight: 800; }
h1 { margin: 6px 0; font-size: 24px; line-height: 1.3; }
h2 { margin: 0; font-size: 17px; }
.reference-header p { margin: 0; color: var(--muted); }
.direction-cards { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.direction-card { padding: 20px; border: 1px solid; border-radius: 8px; }
.output-card { background: #eff6ff; border-color: #bfdbfe; color: #1e40af; }
.input-card { background: #f0fdfa; border-color: #99f6e4; color: #115e59; }
.direction-heading { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
.direction-heading span { font-size: 12px; font-weight: 700; }
.data-flow { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; font-size: 17px; font-weight: 700; }
.direction-card p:last-child { margin-bottom: 0; font-size: 13px; }
.table-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 20px 20px 12px; }
.search-field { display: flex; align-items: center; gap: 8px; width: min(360px, 100%); padding: 0 12px; border: 1px solid var(--line); border-radius: 8px; color: var(--muted); }
.search-field:focus-within { border-color: var(--primary); outline: 2px solid #dbeafe; }
.search-field input { width: 100%; min-width: 0; min-height: 42px; border: 0; outline: 0; background: transparent; color: var(--text); }
.filter-bar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; padding: 0 20px 16px; }
.direction-filter { display: flex; flex-wrap: wrap; gap: 6px; }
.direction-filter button { padding: 7px 12px; border: 1px solid var(--line); border-radius: 6px; background: #fff; color: var(--muted); cursor: pointer; }
.direction-filter button:hover { border-color: var(--primary); }
.direction-filter button.active { background: #eff6ff; border-color: #93c5fd; color: #1d4ed8; font-weight: 700; }
.result-count { color: var(--muted); font-size: 12px; }
.table-scroll { overflow-x: auto; }
.table-scroll:focus-visible { outline: 2px solid var(--primary); outline-offset: -2px; }
table { width: 100%; min-width: 800px; border-collapse: collapse; text-align: left; }
th { padding: 12px 18px; background: #f8fafc; color: #475569; font-size: 12px; font-weight: 700; white-space: nowrap; }
td { padding: 14px 18px; border-top: 1px solid #e8edf3; vertical-align: middle; }
tbody tr:hover { background: #f8fbff; }
code { color: #1e3a8a; font: 700 15px/1.5 ui-monospace, SFMono-Regular, Consolas, monospace; }
td strong { font-weight: 600; }
.english-name { display: block; margin-top: 3px; color: var(--muted); font-size: 12px; }
.direction-badge { display: inline-block; padding: 3px 8px; border-radius: 5px; font-size: 12px; font-weight: 700; white-space: nowrap; }
.direction-badge.output { background: #eff6ff; color: #1d4ed8; }
.direction-badge.input { background: #ccfbf1; color: #115e59; }
.empty-state { padding: 36px 18px; text-align: center; color: var(--muted); }
.pagination { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 14px 20px; border-top: 1px solid var(--line); color: var(--muted); font-size: 13px; font-weight: 700; }
.page-button { width: 34px; height: 34px; display: grid; place-items: center; border: 1px solid var(--line); border-radius: 6px; background: #fff; color: var(--text); cursor: pointer; }
.page-button:not(:disabled):hover { border-color: var(--primary); color: var(--primary); }
.page-button:disabled { cursor: not-allowed; opacity: .45; }
.table-note { margin: 0; padding: 14px 20px; border-top: 1px solid var(--line); color: var(--muted); font-size: 12px; }
.notes-panel { padding: 20px; }
dl { display: grid; gap: 16px; margin: 18px 0 0; }
dt { margin-bottom: 4px; font-weight: 700; }
dd { margin: 0; color: var(--muted); line-height: 1.7; }
@media (max-width: 640px) {
  .direction-cards { grid-template-columns: 1fr; gap: 12px; }
  .reference-header, .direction-card, .notes-panel { padding: 16px; }
  h1 { font-size: 21px; }
  .table-toolbar { align-items: stretch; flex-direction: column; padding: 16px 16px 12px; }
  .search-field { width: 100%; }
  .filter-bar { padding: 0 16px 14px; }
  .direction-filter button { padding: 7px 9px; font-size: 12px; }
  .table-note { padding: 14px 16px; }
}
</style>

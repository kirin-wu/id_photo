<template>
  <main class="angle-tool">
    <section class="angle-header">
      <div class="angle-heading">
        <div class="angle-eyebrow"><Gauge :size="18" /><span>Angle convert</span></div>
        <h1>角度弧度换算</h1>
      </div>
      <button class="icon-button" type="button" title="重置" @click="resetForm">
        <RotateCcw :size="18" />
      </button>
    </section>

    <section class="angle-panel">
      <div class="mode-switch" role="group" aria-label="换算方向">
        <button
          v-for="option in modes"
          :key="option.value"
          type="button"
          :class="{ active: mode === option.value }"
          :aria-pressed="mode === option.value"
          @click="mode = option.value"
        >
          {{ option.label }}
        </button>
      </div>

      <label class="value-field" for="angleInput">
        <span>{{ inputLabel }}</span>
        <div class="input-with-unit">
          <input id="angleInput" v-model="inputValue" type="text" inputmode="decimal" :placeholder="inputPlaceholder" autocomplete="off">
          <span>{{ inputUnit }}</span>
        </div>
      </label>

      <p class="formula">{{ formula }}</p>
      <p class="input-status" :class="{ invalid: validationMessage }">{{ statusText }}</p>
    </section>

    <section class="result-panel" aria-live="polite">
      <div class="result-header">
        <span>{{ outputLabel }}</span>
        <button class="copy-button" type="button" title="复制结果" :disabled="!hasResult" @click="copyResult">
          <Clipboard :size="17" />
          <span>复制</span>
        </button>
      </div>
      <output class="result-value">{{ resultText }}<small v-if="hasResult">{{ outputUnit }}</small></output>
    </section>

    <section class="reference-panel" aria-label="常用角度">
      <span>常用角度</span>
      <div class="reference-list">
        <button v-for="value in referenceValues" :key="value" type="button" @click="inputValue = value">
          {{ value }}{{ inputUnit }}
        </button>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, ref } from "vue";
import { ElMessage } from "element-plus";
import { Clipboard, Gauge, RotateCcw } from "lucide-vue-next";

const modes = [
  { value: "degree", label: "角度转弧度" },
  { value: "radian", label: "弧度转角度" },
];
const mode = ref("degree");
const inputValue = ref("");
const inputNumber = computed(() => parseInput(inputValue.value));
const isDegreeMode = computed(() => mode.value === "degree");
const inputLabel = computed(() => (isDegreeMode.value ? "输入角度" : "输入弧度"));
const outputLabel = computed(() => (isDegreeMode.value ? "换算结果（弧度）" : "换算结果（角度）"));
const inputUnit = computed(() => (isDegreeMode.value ? "deg" : "rad"));
const outputUnit = computed(() => (isDegreeMode.value ? "rad" : "deg"));
const inputPlaceholder = computed(() => (isDegreeMode.value ? "例如：180" : "例如：3.141592653589793"));
const formula = computed(() => (isDegreeMode.value ? "弧度 = 角度 x π / 180" : "角度 = 弧度 x 180 / π"));
const validationMessage = computed(() => {
  if (!inputValue.value.trim()) return "";
  return Number.isFinite(inputNumber.value) ? "" : "请输入有效数值。";
});
const result = computed(() => {
  if (!Number.isFinite(inputNumber.value)) return null;
  return isDegreeMode.value ? inputNumber.value * Math.PI / 180 : inputNumber.value * 180 / Math.PI;
});
const hasResult = computed(() => result.value !== null);
const resultText = computed(() => (hasResult.value ? formatNumber(result.value) : "--"));
const statusText = computed(() => {
  if (!inputValue.value.trim()) return "请输入需要换算的数值。";
  return validationMessage.value || "换算完成";
});
const referenceValues = computed(() => (isDegreeMode.value ? ["0", "30", "45", "90", "180", "360"] : ["0", "0.5235987756", "0.7853981634", "1.5707963268", "3.1415926536", "6.2831853072"]));

function parseInput(value) {
  const normalized = String(value).trim();
  if (!normalized) return NaN;
  return Number(normalized);
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return "--";
  const rounded = Math.abs(value) < 1e-14 ? 0 : value;
  return new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: 12,
    useGrouping: false,
  }).format(rounded);
}

function resetForm() {
  mode.value = "degree";
  inputValue.value = "";
}

async function copyResult() {
  if (!hasResult.value) return;
  try {
    await navigator.clipboard.writeText(`${resultText.value} ${outputUnit.value}`);
    ElMessage.success("结果已复制");
  } catch {
    ElMessage.error("复制失败");
  }
}
</script>

<style scoped>
.angle-tool { width: min(880px, 100%); margin: 0 auto; display: grid; align-content: start; gap: 16px; }
.angle-header, .angle-panel, .result-panel, .reference-panel { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; box-shadow: var(--shadow); }
.angle-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 18px 20px; }
.angle-heading { min-width: 0; }.angle-eyebrow { display: inline-flex; align-items: center; gap: 7px; margin-bottom: 6px; color: #0f766e; font-size: 12px; font-weight: 800; text-transform: uppercase; }.angle-heading h1 { margin: 0; font-size: 22px; line-height: 1.25; }
.icon-button, .copy-button { min-height: 38px; border: 1px solid var(--line); border-radius: 8px; background: #fff; color: var(--text); cursor: pointer; font-weight: 800; }.icon-button { width: 38px; display: grid; place-items: center; }.copy-button { display: inline-flex; align-items: center; gap: 7px; padding: 0 12px; }.icon-button:hover, .copy-button:not(:disabled):hover { background: #f8fafc; border-color: #cbd5e1; }.copy-button:disabled { cursor: not-allowed; opacity: .5; }
.angle-panel { display: grid; gap: 16px; padding: 20px; }.mode-switch { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; padding: 4px; border: 1px solid #cbd5e1; border-radius: 8px; background: #f8fafc; }.mode-switch button { min-height: 38px; border: 0; border-radius: 6px; background: transparent; color: #475569; cursor: pointer; font-weight: 800; }.mode-switch button.active { background: #fff; color: var(--primary); box-shadow: 0 1px 4px rgba(15, 23, 42, .12); }
.value-field { display: grid; gap: 7px; }.value-field > span { color: #334155; font-weight: 800; }.input-with-unit { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; overflow: hidden; }.input-with-unit:focus-within { border-color: var(--primary); }.input-with-unit input { width: 100%; min-height: 48px; padding: 11px 13px; border: 0; outline: 0; color: var(--text); font: 700 20px/1.4 ui-monospace, SFMono-Regular, Consolas, monospace; }.input-with-unit span { padding: 0 14px; color: #64748b; font-weight: 800; }
.formula, .input-status { min-height: 42px; margin: 0; padding: 10px 12px; border-radius: 8px; font-weight: 800; }.formula { background: #eff6ff; color: #1d4ed8; }.input-status { background: #ecfdf5; color: #047857; }.input-status.invalid { background: #fff7ed; color: #c2410c; }
.result-panel { display: grid; gap: 14px; padding: 20px; }.result-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }.result-header > span, .reference-panel > span { color: var(--muted); font-size: 12px; font-weight: 800; }.result-value { display: block; min-height: 74px; padding: 14px; border: 1px solid #dbeafe; border-radius: 8px; background: #f8fbff; color: #1d4ed8; font: 800 30px/1.2 ui-monospace, SFMono-Regular, Consolas, monospace; overflow-wrap: anywhere; }.result-value small { margin-left: 10px; color: #64748b; font: 800 15px/1.2 system-ui, sans-serif; }
.reference-panel { display: grid; gap: 10px; padding: 16px 20px; }.reference-list { display: flex; flex-wrap: wrap; gap: 8px; }.reference-list button { min-width: 72px; min-height: 34px; padding: 0 10px; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff; color: #334155; cursor: pointer; font-weight: 800; }.reference-list button:hover { border-color: var(--primary); color: var(--primary); }
@media (max-width: 560px) { .angle-header, .angle-panel, .result-panel, .reference-panel { padding: 16px; }.mode-switch { grid-template-columns: 1fr; }.result-value { font-size: 24px; }.reference-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }.reference-list button { width: 100%; min-width: 0; } }
</style>

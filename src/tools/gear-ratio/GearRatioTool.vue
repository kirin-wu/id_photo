<template>
  <main class="ratio-tool">
    <section class="ratio-header">
      <div class="ratio-heading">
        <div class="ratio-eyebrow">
          <Calculator :size="18" />
          <span>Robot joint</span>
        </div>
        <h1>实际减速比计算</h1>
      </div>

      <div class="ratio-actions">
        <button class="ratio-icon-btn" type="button" title="重置" @click="resetForm">
          <RotateCcw :size="18" />
        </button>
        <button class="ratio-copy-btn" type="button" :disabled="!hasResult" @click="copyResult">
          <Clipboard :size="17" />
          <span>复制结果</span>
        </button>
      </div>
    </section>

    <section class="ratio-layout">
      <form class="ratio-panel ratio-form" @submit.prevent>
        <label class="ratio-field" for="nominalRatio">
          <span>原始减速比 a</span>
          <input
            id="nominalRatio"
            v-model="form.nominalRatio"
            type="number"
            inputmode="decimal"
            min="0"
            step="any"
            placeholder="如 80"
          >
        </label>

        <label class="ratio-field" for="displayAngle">
          <span>示教器显示角度 β</span>
          <div class="ratio-input-unit">
            <input
              id="displayAngle"
              v-model="form.displayAngle"
              type="number"
              inputmode="decimal"
              step="any"
              placeholder="如 90"
            >
            <span>deg</span>
          </div>
        </label>

        <label class="ratio-field" for="actualAngle">
          <span>实际转动角度 Θ</span>
          <div class="ratio-input-unit">
            <input
              id="actualAngle"
              v-model="form.actualAngle"
              type="number"
              inputmode="decimal"
              step="any"
              placeholder="如 88.5"
            >
            <span>deg</span>
          </div>
        </label>

        <div class="formula-strip">
          <span>b = a × (|β| / |Θ|)</span>
          <small>同方向时等同 b = a × (β / Θ)</small>
        </div>
      </form>

      <section class="ratio-panel result-panel" aria-live="polite">
        <div class="result-main">
          <span>实际减速比 b</span>
          <strong>{{ resultText }}</strong>
        </div>

        <p v-if="validationMessage" class="result-message invalid">{{ validationMessage }}</p>
        <p v-else-if="directionWarning" class="result-message warn">{{ directionWarning }}</p>
        <p v-else class="result-message">{{ adjustmentText }}</p>

        <div class="result-grid">
          <div class="metric">
            <span>修正系数 |β|/|Θ|</span>
            <strong>{{ factorText }}</strong>
          </div>
          <div class="metric">
            <span>相对偏差</span>
            <strong>{{ deviationText }}</strong>
          </div>
        </div>
      </section>
    </section>
  </main>
</template>

<script setup>
import { computed, reactive } from "vue";
import { ElMessage } from "element-plus";
import { Calculator, Clipboard, RotateCcw } from "lucide-vue-next";

const initialForm = {
  nominalRatio: "",
  displayAngle: "",
  actualAngle: "",
};

const form = reactive({ ...initialForm });

const numericValues = computed(() => ({
  nominalRatio: parseDecimal(form.nominalRatio),
  displayAngle: parseDecimal(form.displayAngle),
  actualAngle: parseDecimal(form.actualAngle),
}));

const validationMessage = computed(() => {
  const { nominalRatio, displayAngle, actualAngle } = numericValues.value;

  if (![nominalRatio, displayAngle, actualAngle].every(Number.isFinite)) {
    return "请输入三个有效数值。";
  }

  if (nominalRatio <= 0) {
    return "原始减速比必须大于 0。";
  }

  if (displayAngle === 0 || actualAngle === 0) {
    return "显示角度和实测角度不能为 0。";
  }

  return "";
});

const ratioFactor = computed(() => {
  if (validationMessage.value) return null;
  const { displayAngle, actualAngle } = numericValues.value;
  return Math.abs(displayAngle) / Math.abs(actualAngle);
});

const actualRatio = computed(() => {
  if (ratioFactor.value === null) return null;
  return numericValues.value.nominalRatio * ratioFactor.value;
});

const deviationPercent = computed(() => {
  if (actualRatio.value === null) return null;
  const { nominalRatio } = numericValues.value;
  return (actualRatio.value - nominalRatio) / nominalRatio * 100;
});

const hasResult = computed(() => actualRatio.value !== null);

const resultText = computed(() => formatNumber(actualRatio.value));
const factorText = computed(() => formatNumber(ratioFactor.value, 8));
const deviationText = computed(() => {
  if (deviationPercent.value === null) return "--";
  const sign = deviationPercent.value > 0 ? "+" : "";
  return `${sign}${formatNumber(deviationPercent.value, 4)}%`;
});

const directionWarning = computed(() => {
  if (validationMessage.value) return "";
  const { displayAngle, actualAngle } = numericValues.value;
  return Math.sign(displayAngle) !== Math.sign(actualAngle)
    ? "显示角度和实测角度方向相反，请先确认测量方向；当前结果按角度幅值计算。"
    : "";
});

const adjustmentText = computed(() => {
  if (actualRatio.value === null) return "";
  const delta = actualRatio.value - numericValues.value.nominalRatio;

  if (Math.abs(delta) < 1e-10) {
    return "实测角度与显示角度一致，减速比不需要修正。";
  }

  return delta > 0
    ? "实测角度偏小，实际减速比应比原始值更大。"
    : "实测角度偏大，实际减速比应比原始值更小。";
});

function parseDecimal(value) {
  if (value === "" || value === null || value === undefined) return NaN;
  return Number(String(value).trim());
}

function formatNumber(value, maximumFractionDigits = 6) {
  if (!Number.isFinite(value)) return "--";
  return new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits,
    minimumFractionDigits: 0,
    useGrouping: false,
  }).format(value);
}

function resetForm() {
  Object.assign(form, initialForm);
}

async function copyResult() {
  if (!hasResult.value) return;

  const content = [
    `实际减速比 b: ${resultText.value}`,
    `修正系数 |β|/|Θ|: ${factorText.value}`,
    `相对偏差: ${deviationText.value}`,
  ].join("\n");

  try {
    await navigator.clipboard.writeText(content);
    ElMessage.success("结果已复制");
  } catch {
    ElMessage.error("复制失败");
  }
}
</script>

<style scoped>
.ratio-tool {
  width: min(1080px, 100%);
  margin: 0 auto;
  display: grid;
  align-content: start;
  gap: 16px;
}

.ratio-header,
.ratio-panel {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 8px;
  box-shadow: var(--shadow);
}

.ratio-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
}

.ratio-heading {
  min-width: 0;
}

.ratio-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 6px;
  color: #047857;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
}

.ratio-heading h1 {
  margin: 0;
  font-size: 22px;
  line-height: 1.25;
}

.ratio-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ratio-icon-btn,
.ratio-copy-btn {
  min-height: 38px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
  color: var(--text);
  cursor: pointer;
  font-weight: 700;
}

.ratio-icon-btn {
  width: 38px;
  display: grid;
  place-items: center;
}

.ratio-copy-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 13px;
}

.ratio-copy-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.ratio-icon-btn:hover,
.ratio-copy-btn:not(:disabled):hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.ratio-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 0.8fr);
  gap: 14px;
  align-items: start;
}

.ratio-panel {
  padding: 20px;
}

.ratio-form {
  display: grid;
  gap: 16px;
}

.ratio-field {
  display: grid;
  gap: 7px;
}

.ratio-field span {
  color: #334155;
  font-weight: 800;
}

.ratio-field input {
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #fff;
  color: var(--text);
}

.ratio-field input:focus {
  border-color: var(--primary);
}

.ratio-input-unit {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #fff;
  overflow: hidden;
}

.ratio-input-unit:focus-within {
  border-color: var(--primary);
}

.ratio-input-unit input {
  border: 0;
  border-radius: 0;
}

.ratio-input-unit span {
  padding: 0 12px;
  color: #64748b;
  font-weight: 800;
}

.formula-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 8px;
  background: #ecfdf5;
  color: #065f46;
}

.formula-strip span {
  font-weight: 900;
}

.formula-strip small {
  color: #0f766e;
  font-weight: 800;
}

.result-panel {
  display: grid;
  gap: 16px;
}

.result-main {
  display: grid;
  gap: 6px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--line);
}

.result-main span,
.metric span {
  color: var(--muted);
  font-size: 12px;
  font-weight: 800;
}

.result-main strong {
  color: #047857;
  font-size: clamp(28px, 6vw, 44px);
  line-height: 1.1;
  overflow-wrap: anywhere;
}

.result-message {
  min-height: 48px;
  margin: 0;
  padding: 11px 12px;
  border-radius: 8px;
  background: #f0f9ff;
  color: #075985;
  font-weight: 700;
}

.result-message.invalid {
  background: #f8fafc;
  color: #64748b;
}

.result-message.warn {
  background: #fffbeb;
  color: #92400e;
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.metric {
  display: grid;
  gap: 4px;
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
}

.metric strong {
  font-size: 18px;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

@media (max-width: 760px) {
  .ratio-header,
  .ratio-layout {
    grid-template-columns: 1fr;
  }

  .ratio-header {
    display: grid;
  }

  .ratio-actions {
    width: 100%;
  }

  .ratio-copy-btn {
    flex: 1;
  }
}

@media (max-width: 480px) {
  .ratio-panel,
  .ratio-header {
    padding: 16px;
  }

  .formula-strip,
  .result-grid {
    grid-template-columns: 1fr;
  }

  .formula-strip {
    display: grid;
  }
}
</style>

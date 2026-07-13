<template>
  <main class="ratio-tool">
    <section class="ratio-header">
      <div class="ratio-heading">
        <div class="ratio-eyebrow"><Calculator :size="18" /><span>Robot joint</span></div>
        <h1>{{ text.title }}</h1>
      </div>
      <div class="ratio-actions">
        <button class="ratio-icon-btn" type="button" :title="text.reset" @click="resetForm"><RotateCcw :size="18" /></button>
        <button class="ratio-copy-btn" type="button" :disabled="!hasResult" @click="copyResult">
          <Clipboard :size="17" /><span>{{ text.copy }}</span>
        </button>
      </div>
    </section>

    <section class="ratio-layout">
      <form class="ratio-panel ratio-form" @submit.prevent>
        <div class="ratio-mode" role="group" aria-label="Calculation type">
          <button
            v-for="option in modeOptions"
            :key="option.value"
            class="ratio-mode-button"
            :class="{ active: form.mode === option.value }"
            type="button"
            :aria-pressed="form.mode === option.value"
            @click="form.mode = option.value"
          >
            <component :is="option.icon" :size="16" />
            <span>{{ option.label }}</span>
          </button>
        </div>

        <label class="ratio-field" for="nominalRatio">
          <span>{{ text.nominalRatio }} a</span>
          <input id="nominalRatio" v-model="form.nominalRatio" type="number" inputmode="decimal" min="0" step="any" placeholder="80">
        </label>

        <label class="ratio-field" for="displayMotion">
          <span>{{ displayMotionLabel }}</span>
          <div class="ratio-input-unit">
            <input id="displayMotion" v-model="form.displayMotion" type="number" inputmode="decimal" step="any" :placeholder="motionPlaceholder">
            <span>{{ motionUnit }}</span>
          </div>
        </label>

        <label class="ratio-field" for="actualMotion">
          <span>{{ actualMotionLabel }}</span>
          <div class="ratio-input-unit">
            <input id="actualMotion" v-model="form.actualMotion" type="number" inputmode="decimal" step="any" :placeholder="motionPlaceholder">
            <span>{{ motionUnit }}</span>
          </div>
        </label>

        <div class="formula-strip">
          <span>{{ formulaText }}</span>
          <small>{{ formulaHint }}</small>
        </div>
      </form>

      <section class="ratio-panel result-panel" aria-live="polite">
        <div class="result-main">
          <span>{{ text.actualRatio }} b</span>
          <strong>{{ resultText }}</strong>
        </div>
        <p v-if="validationMessage" class="result-message invalid">{{ validationMessage }}</p>
        <p v-else-if="directionWarning" class="result-message warn">{{ directionWarning }}</p>
        <p v-else class="result-message">{{ adjustmentText }}</p>
        <div class="result-grid">
          <div class="metric"><span>{{ factorLabel }}</span><strong>{{ factorText }}</strong></div>
          <div class="metric"><span>{{ text.deviation }}</span><strong>{{ deviationText }}</strong></div>
        </div>
      </section>
    </section>
  </main>
</template>

<script setup>
import { computed, reactive } from "vue";
import { ElMessage } from "element-plus";
import { Calculator, Clipboard, MoveRight, RotateCcw, RotateCw } from "lucide-vue-next";

const initialForm = { mode: "angle", nominalRatio: "", displayMotion: "", actualMotion: "" };
const form = reactive({ ...initialForm });
const text = {
  title: "\u5b9e\u9645\u51cf\u901f\u6bd4\u8ba1\u7b97",
  reset: "\u91cd\u7f6e",
  copy: "\u590d\u5236\u7ed3\u679c",
  nominalRatio: "\u539f\u59cb\u51cf\u901f\u6bd4",
  actualRatio: "\u5b9e\u9645\u51cf\u901f\u6bd4",
  deviation: "\u76f8\u5bf9\u504f\u5dee",
  angle: "\u89d2\u5ea6",
  linear: "\u76f4\u7ebf",
  displayAngle: "\u793a\u6559\u5668\u663e\u793a\u89d2\u5ea6 \u03b8",
  actualAngle: "\u5b9e\u9645\u8f6c\u52a8\u89d2\u5ea6 \u03c6",
  displayLinear: "\u793a\u6559\u5668\u663e\u793a\u76f4\u7ebf\u8ddd\u79bb L1",
  actualLinear: "\u5b9e\u9645\u79fb\u52a8\u8ddd\u79bb L2",
  required: "\u8bf7\u8f93\u5165\u4e09\u4e2a\u6709\u6548\u6570\u503c\u3002",
  invalidRatio: "\u539f\u59cb\u51cf\u901f\u6bd4\u5fc5\u987b\u5927\u4e8e 0\u3002",
  sameUnit: "\u663e\u793a\u8ddd\u79bb\u548c\u5b9e\u6d4b\u8ddd\u79bb\u8bf7\u4f7f\u7528\u76f8\u540c\u5355\u4f4d",
  copied: "\u7ed3\u679c\u5df2\u590d\u5236",
  copyFailed: "\u590d\u5236\u5931\u8d25",
};

const modeOptions = [
  { value: "angle", label: text.angle, icon: RotateCw },
  { value: "linear", label: text.linear, icon: MoveRight },
];
const isAngleMode = computed(() => form.mode === "angle");
const motionUnit = computed(() => (isAngleMode.value ? "deg" : "mm"));
const displayMotionLabel = computed(() => (isAngleMode.value ? text.displayAngle : text.displayLinear));
const actualMotionLabel = computed(() => (isAngleMode.value ? text.actualAngle : text.actualLinear));
const motionPlaceholder = computed(() => (isAngleMode.value ? "90" : "100"));
const formulaText = computed(() => (isAngleMode.value ? "b = a x (|\u03b8| / |\u03c6|)" : "b = a x (|L1| / |L2|)"));
const formulaHint = computed(() => (isAngleMode.value ? "\u540c\u65b9\u5411\u65f6\u7b49\u540c b = a x (\u03b8 / \u03c6)" : text.sameUnit));
const factorLabel = computed(() => (isAngleMode.value ? "\u4fee\u6b63\u7cfb\u6570 |\u03b8|/|\u03c6|" : "\u4fee\u6b63\u7cfb\u6570 |L1|/|L2|"));

const numericValues = computed(() => ({
  nominalRatio: parseDecimal(form.nominalRatio),
  displayMotion: parseDecimal(form.displayMotion),
  actualMotion: parseDecimal(form.actualMotion),
}));
const motionName = computed(() => (isAngleMode.value ? "\u89d2\u5ea6" : "\u8ddd\u79bb"));
const validationMessage = computed(() => {
  const { nominalRatio, displayMotion, actualMotion } = numericValues.value;
  if (![nominalRatio, displayMotion, actualMotion].every(Number.isFinite)) return text.required;
  if (nominalRatio <= 0) return text.invalidRatio;
  if (displayMotion === 0 || actualMotion === 0) return `\u663e\u793a${motionName.value}\u548c\u5b9e\u6d4b${motionName.value}\u4e0d\u80fd\u4e3a 0\u3002`;
  return "";
});
const ratioFactor = computed(() => {
  if (validationMessage.value) return null;
  const { displayMotion, actualMotion } = numericValues.value;
  return Math.abs(displayMotion) / Math.abs(actualMotion);
});
const actualRatio = computed(() => ratioFactor.value === null ? null : numericValues.value.nominalRatio * ratioFactor.value);
const deviationPercent = computed(() => actualRatio.value === null ? null : (actualRatio.value - numericValues.value.nominalRatio) / numericValues.value.nominalRatio * 100);
const hasResult = computed(() => actualRatio.value !== null);
const resultText = computed(() => formatNumber(actualRatio.value));
const factorText = computed(() => formatNumber(ratioFactor.value, 8));
const deviationText = computed(() => {
  if (deviationPercent.value === null) return "--";
  return `${deviationPercent.value > 0 ? "+" : ""}${formatNumber(deviationPercent.value, 4)}%`;
});
const directionWarning = computed(() => {
  if (validationMessage.value) return "";
  const { displayMotion, actualMotion } = numericValues.value;
  return Math.sign(displayMotion) !== Math.sign(actualMotion)
    ? `\u663e\u793a${motionName.value}\u548c\u5b9e\u6d4b${motionName.value}\u65b9\u5411\u76f8\u53cd\uff0c\u8bf7\u5148\u786e\u8ba4\u6d4b\u91cf\u65b9\u5411\uff1b\u5f53\u524d\u7ed3\u679c\u6309\u4f4d\u79fb\u5e45\u503c\u8ba1\u7b97\u3002`
    : "";
});
const adjustmentText = computed(() => {
  if (actualRatio.value === null) return "";
  const delta = actualRatio.value - numericValues.value.nominalRatio;
  if (Math.abs(delta) < 1e-10) return `\u5b9e\u6d4b${motionName.value}\u4e0e\u663e\u793a${motionName.value}\u4e00\u81f4\uff0c\u51cf\u901f\u6bd4\u4e0d\u9700\u8981\u4fee\u6b63\u3002`;
  return delta > 0
    ? `\u5b9e\u6d4b${motionName.value}\u504f\u5c0f\uff0c\u5b9e\u9645\u51cf\u901f\u6bd4\u5e94\u6bd4\u539f\u59cb\u503c\u66f4\u5927\u3002`
    : `\u5b9e\u6d4b${motionName.value}\u504f\u5927\uff0c\u5b9e\u9645\u51cf\u901f\u6bd4\u5e94\u6bd4\u539f\u59cb\u503c\u66f4\u5c0f\u3002`;
});

function parseDecimal(value) { return value === "" || value === null || value === undefined ? NaN : Number(String(value).trim()); }
function formatNumber(value, maximumFractionDigits = 6) {
  if (!Number.isFinite(value)) return "--";
  return new Intl.NumberFormat("zh-CN", { maximumFractionDigits, minimumFractionDigits: 0, useGrouping: false }).format(value);
}
function resetForm() { Object.assign(form, initialForm); }
async function copyResult() {
  if (!hasResult.value) return;
  const content = [
    `\u5b9e\u9645\u51cf\u901f\u6bd4 b: ${resultText.value}`,
    `\u8ba1\u7b97\u7c7b\u578b: ${isAngleMode.value ? text.angle : text.linear}`,
    `${factorLabel.value}: ${factorText.value}`,
    `\u76f8\u5bf9\u504f\u5dee: ${deviationText.value}`,
  ].join("\n");
  try { await navigator.clipboard.writeText(content); ElMessage.success(text.copied); } catch { ElMessage.error(text.copyFailed); }
}
</script>

<style scoped>
.ratio-tool { width: min(1080px, 100%); margin: 0 auto; display: grid; align-content: start; gap: 16px; }
.ratio-header, .ratio-panel { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; box-shadow: var(--shadow); }
.ratio-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 18px 20px; }
.ratio-heading { min-width: 0; }.ratio-eyebrow { display: inline-flex; align-items: center; gap: 7px; margin-bottom: 6px; color: #047857; font-size: 12px; font-weight: 800; text-transform: uppercase; }
.ratio-heading h1 { margin: 0; font-size: 22px; line-height: 1.25; }.ratio-actions { display: flex; align-items: center; gap: 8px; }
.ratio-icon-btn, .ratio-copy-btn, .ratio-mode-button { min-height: 38px; border: 1px solid var(--line); border-radius: 8px; background: #fff; color: var(--text); cursor: pointer; font-weight: 700; }
.ratio-icon-btn { width: 38px; display: grid; place-items: center; }.ratio-copy-btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 0 13px; }
.ratio-copy-btn:disabled { cursor: not-allowed; opacity: .5; }.ratio-icon-btn:hover, .ratio-copy-btn:not(:disabled):hover { background: #f8fafc; border-color: #cbd5e1; }
.ratio-layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(320px, .8fr); gap: 14px; align-items: start; }.ratio-panel { padding: 20px; }.ratio-form { display: grid; gap: 16px; }
.ratio-mode { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }.ratio-mode-button { display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-height: 42px; }.ratio-mode-button.active { background: #047857; border-color: #047857; color: #fff; }
.ratio-field { display: grid; gap: 7px; }.ratio-field > span { color: #334155; font-weight: 800; }.ratio-field input { width: 100%; min-height: 44px; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; color: var(--text); }.ratio-field input:focus { border-color: var(--primary); }
.ratio-input-unit { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; overflow: hidden; }.ratio-input-unit:focus-within { border-color: var(--primary); }.ratio-input-unit input { border: 0; border-radius: 0; }.ratio-input-unit span { padding: 0 12px; color: #64748b; font-weight: 800; }
.formula-strip { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 14px; border-radius: 8px; background: #ecfdf5; color: #065f46; }.formula-strip span { font-weight: 900; }.formula-strip small { color: #0f766e; font-weight: 800; }
.result-panel { display: grid; gap: 16px; }.result-main { display: grid; gap: 6px; padding-bottom: 14px; border-bottom: 1px solid var(--line); }.result-main span, .metric span { color: var(--muted); font-size: 12px; font-weight: 800; }.result-main strong { color: #047857; font-size: clamp(28px, 6vw, 44px); line-height: 1.1; overflow-wrap: anywhere; }
.result-message { min-height: 48px; margin: 0; padding: 11px 12px; border-radius: 8px; background: #f0f9ff; color: #075985; font-weight: 700; }.result-message.invalid { background: #f8fafc; color: #64748b; }.result-message.warn { background: #fffbeb; color: #92400e; }
.result-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }.metric { display: grid; gap: 4px; min-width: 0; padding: 12px; border: 1px solid var(--line); border-radius: 8px; background: #fff; }.metric strong { font-size: 18px; line-height: 1.25; overflow-wrap: anywhere; }
@media (max-width: 760px) { .ratio-header, .ratio-layout { grid-template-columns: 1fr; }.ratio-header { display: grid; }.ratio-actions { width: 100%; }.ratio-copy-btn { flex: 1; } }
@media (max-width: 480px) { .ratio-panel, .ratio-header { padding: 16px; }.formula-strip, .result-grid { grid-template-columns: 1fr; }.formula-strip { display: grid; } }
</style>

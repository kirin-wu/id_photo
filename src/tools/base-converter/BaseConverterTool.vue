<template>
  <main class="base-tool">
    <section class="base-header">
      <div class="base-heading">
        <div class="base-eyebrow">
          <Binary :size="18" />
          <span>Base convert</span>
        </div>
        <h1>进制转化</h1>
      </div>

      <button class="base-icon-btn" type="button" title="重置" @click="resetForm">
        <RotateCcw :size="18" />
      </button>
    </section>

    <section class="input-panel">
      <div class="base-row">
        <span>输入进制</span>
        <div class="base-switch" role="group" aria-label="输入进制">
          <button
            v-for="mode in inputModes"
            :key="mode.value"
            type="button"
            :class="{ active: inputMode === mode.value }"
            @click="setMode(mode.value)"
          >
            {{ mode.label }}
          </button>
        </div>
      </div>

      <label class="value-field" for="baseInput">
        <span>输入数值</span>
        <textarea
          id="baseInput"
          v-model="inputValue"
          :placeholder="activeMode.placeholder"
          rows="4"
          spellcheck="false"
        />
      </label>

      <p class="input-status" :class="{ invalid: validationMessage }">
        {{ statusText }}
      </p>
    </section>

    <section class="output-grid" aria-live="polite">
      <article v-for="result in results" :key="result.base" class="output-card">
        <div class="output-head">
          <div>
            <span>{{ result.short }}</span>
            <h2>{{ result.label }}</h2>
          </div>
          <button
            class="copy-btn"
            type="button"
            title="复制"
            :disabled="!canCopy"
            @click="copyResult(result)"
          >
            <Clipboard :size="17" />
          </button>
        </div>
        <output class="output-value">{{ result.value }}</output>
      </article>
    </section>
  </main>
</template>

<script setup>
import { computed, ref } from "vue";
import { ElMessage } from "element-plus";
import { Binary, Clipboard, RotateCcw } from "lucide-vue-next";

const bases = [
  {
    value: 2,
    label: "二进制",
    short: "BIN",
    placeholder: "101101",
    invalidText: "二进制只允许输入 0 和 1。",
  },
  {
    value: 10,
    label: "十进制",
    short: "DEC",
    placeholder: "12345",
    invalidText: "十进制只允许输入 0 到 9。",
  },
  {
    value: 16,
    label: "十六进制",
    short: "HEX",
    placeholder: "2A7F",
    invalidText: "十六进制只允许输入 0 到 9 和 A 到 F。",
  },
];

const inputModes = [
  {
    value: "auto",
    label: "自动识别",
    placeholder: "23aa / 0x23aa / 101101 / 12345",
  },
  ...bases,
];

const inputMode = ref("auto");
const inputValue = ref("");

const activeMode = computed(() => inputModes.find((mode) => mode.value === inputMode.value) ?? inputModes[0]);
const detectedBaseValue = computed(() => detectInputBase(inputValue.value, inputMode.value));
const activeBase = computed(() => bases.find((base) => base.value === detectedBaseValue.value) ?? bases[1]);

const parsedInput = computed(() => parseBaseInteger(inputValue.value, activeBase.value.value));
const validationMessage = computed(() => parsedInput.value.error);
const canCopy = computed(() => parsedInput.value.value !== null);

const statusText = computed(() => {
  if (!inputValue.value.trim()) return "等待输入";
  if (validationMessage.value) return validationMessage.value;
  if (inputMode.value === "auto") return `已识别为${activeBase.value.label}`;
  return "转换完成";
});

const results = computed(() =>
  bases.map((base) => ({
    ...base,
    base: base.value,
    value: parsedInput.value.value === null ? "--" : formatBase(parsedInput.value.value, base.value),
  })),
);

function setMode(value) {
  inputMode.value = value;
}

function resetForm() {
  inputMode.value = "auto";
  inputValue.value = "";
}

function detectInputBase(rawValue, mode) {
  if (mode !== "auto") return mode;

  let text = normalizeInput(rawValue);
  if (text.startsWith("-") || text.startsWith("+")) {
    text = text.slice(1);
  }

  if (/^0b/i.test(text)) return 2;
  if (/^0x/i.test(text) || /[a-f]/i.test(text)) return 16;
  return 10;
}

function parseBaseInteger(rawValue, base) {
  const text = normalizeInput(rawValue);
  if (!text) return { value: null, error: "" };

  const selectedBase = bases.find((item) => item.value === base) ?? bases[1];
  let unsignedText = text;
  let sign = 1n;

  if (unsignedText.startsWith("-")) {
    sign = -1n;
    unsignedText = unsignedText.slice(1);
  } else if (unsignedText.startsWith("+")) {
    unsignedText = unsignedText.slice(1);
  }

  unsignedText = stripMatchingPrefix(unsignedText, base);

  if (!unsignedText) return { value: null, error: "请输入要转换的数值。" };
  if (!isValidForBase(unsignedText, base)) {
    return { value: null, error: selectedBase.invalidText };
  }

  try {
    const value = parseUnsignedBigInt(unsignedText, base) * sign;
    return { value, error: "" };
  } catch {
    return { value: null, error: "数值解析失败，请检查输入。" };
  }
}

function normalizeInput(value) {
  return String(value).trim().replace(/[\s_]/g, "");
}

function stripMatchingPrefix(value, base) {
  if (base === 2 && /^0b/i.test(value)) return value.slice(2);
  if (base === 16 && /^0x/i.test(value)) return value.slice(2);
  return value;
}

function isValidForBase(value, base) {
  if (base === 2) return /^[01]+$/.test(value);
  if (base === 10) return /^\d+$/.test(value);
  return /^[0-9a-f]+$/i.test(value);
}

function parseUnsignedBigInt(value, base) {
  if (base === 2) return BigInt(`0b${value}`);
  if (base === 16) return BigInt(`0x${value}`);
  return BigInt(value);
}

function formatBase(value, base) {
  const sign = value < 0n ? "-" : "";
  const absoluteValue = value < 0n ? -value : value;
  return `${sign}${absoluteValue.toString(base).toUpperCase()}`;
}

async function copyResult(result) {
  if (!canCopy.value) return;

  try {
    await navigator.clipboard.writeText(result.value);
    ElMessage.success(`${result.label}结果已复制`);
  } catch {
    ElMessage.error("复制失败");
  }
}
</script>

<style scoped>
.base-tool {
  width: min(980px, 100%);
  margin: 0 auto;
  display: grid;
  align-content: start;
  gap: 16px;
}

.base-header,
.input-panel,
.output-card {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 8px;
  box-shadow: var(--shadow);
}

.base-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
}

.base-heading {
  min-width: 0;
}

.base-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 6px;
  color: #0f766e;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
}

.base-heading h1 {
  margin: 0;
  font-size: 22px;
  line-height: 1.25;
}

.base-icon-btn,
.copy-btn {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
  color: var(--text);
  cursor: pointer;
}

.base-icon-btn:hover,
.copy-btn:not(:disabled):hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.copy-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.input-panel {
  display: grid;
  gap: 16px;
  padding: 20px;
}

.base-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.base-row > span,
.value-field > span {
  color: #334155;
  font-weight: 800;
}

.base-switch {
  display: inline-grid;
  grid-template-columns: repeat(4, minmax(82px, 1fr));
  gap: 6px;
  padding: 4px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #f8fafc;
}

.base-switch button {
  min-height: 34px;
  padding: 0 12px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #475569;
  cursor: pointer;
  font-weight: 800;
}

.base-switch button.active {
  background: #fff;
  color: var(--primary);
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.12);
}

.value-field {
  display: grid;
  gap: 7px;
}

.value-field textarea {
  width: 100%;
  min-height: 126px;
  resize: vertical;
  padding: 13px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #fff;
  color: var(--text);
  font: 700 22px/1.4 ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace;
  overflow-wrap: anywhere;
}

.value-field textarea:focus {
  border-color: var(--primary);
  outline: none;
}

.input-status {
  min-height: 42px;
  margin: 0;
  padding: 10px 12px;
  border-radius: 8px;
  background: #ecfdf5;
  color: #047857;
  font-weight: 800;
}

.input-status.invalid {
  background: #fff7ed;
  color: #c2410c;
}

.output-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.output-card {
  min-width: 0;
  display: grid;
  gap: 18px;
  padding: 18px;
}

.output-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.output-head span {
  color: #64748b;
  font-size: 12px;
  font-weight: 900;
}

.output-head h2 {
  margin: 2px 0 0;
  font-size: 16px;
  line-height: 1.3;
}

.output-value {
  min-height: 84px;
  display: block;
  padding: 14px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
  color: #0f172a;
  font: 800 20px/1.35 ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

@media (max-width: 760px) {
  .base-row {
    align-items: stretch;
    flex-direction: column;
  }

  .base-switch,
  .output-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .base-header,
  .input-panel,
  .output-card {
    padding: 16px;
  }

  .value-field textarea {
    font-size: 18px;
  }
}
</style>

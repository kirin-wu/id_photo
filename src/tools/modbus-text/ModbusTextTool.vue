<template>
  <main class="modbus-tool">
    <section class="modbus-header">
      <div>
        <div class="modbus-eyebrow"><Network :size="17" /><span>MODBUS TEXT</span></div>
        <h1>{{ text.title }}</h1>
        <p>{{ text.subtitle }}</p>
      </div>
      <div class="header-actions">
        <button class="icon-button" type="button" :title="text.example" @click="loadExample">
          <FileText :size="18" />
        </button>
        <button class="icon-button" type="button" :title="text.reset" @click="resetForm">
          <RotateCcw :size="18" />
        </button>
      </div>
    </section>

    <section class="decode-panel">
      <div class="control-row">
        <div class="control-group">
          <span class="control-label">{{ text.protocol }}</span>
          <div class="segment-control" role="group" :aria-label="text.protocol">
            <button v-for="option in protocolOptions" :key="option.value" type="button" :class="{ active: protocol === option.value }" @click="protocol = option.value">
              {{ option.label }}
            </button>
          </div>
        </div>
        <div class="control-group">
          <span class="control-label">{{ text.encoding }}</span>
          <div class="segment-control" role="group" :aria-label="text.encoding">
            <button v-for="option in encodingOptions" :key="option.value" type="button" :class="{ active: encoding === option.value }" @click="encoding = option.value">
              {{ option.label }}
            </button>
          </div>
        </div>
      </div>

      <label class="packet-field" for="modbusPacket">
        <span>{{ text.packet }}</span>
        <textarea id="modbusPacket" v-model="packet" rows="6" spellcheck="false" :placeholder="text.placeholder" />
      </label>
      <div class="hint-line"><Info :size="16" /><span>{{ protocolHint }}</span></div>
      <p v-if="result.error" class="status-message is-error"><AlertCircle :size="17" />{{ result.error }}</p>
      <p v-else-if="result.warning" class="status-message is-warning"><AlertTriangle :size="17" />{{ result.warning }}</p>
    </section>

    <section class="steps" aria-live="polite">
      <article class="step-card">
        <div class="step-heading"><span>01</span><div><h2>{{ text.extract }}</h2><p>{{ extractionMeta }}</p></div></div>
        <HexOutput :value="result.dataHex" :copy-label="text.copy" @copy="copyValue(result.dataHex, text.extract)" />
      </article>
      <article class="step-card">
        <div class="step-heading"><span>02</span><div><h2>{{ text.swap }}</h2><p>{{ result.wasPadded ? text.padded : text.swapHelp }}</p></div></div>
        <HexOutput :value="result.swappedHex" :copy-label="text.copy" @copy="copyValue(result.swappedHex, text.swap)" />
      </article>
      <article class="step-card">
        <div class="step-heading"><span>03</span><div><h2>{{ text.trim }}</h2><p>{{ trimMeta }}</p></div></div>
        <HexOutput :value="result.trimmedHex" :copy-label="text.copy" @copy="copyValue(result.trimmedHex, text.trim)" />
      </article>
    </section>

    <section class="decoded-result" :class="{ empty: !result.text && !result.error }">
      <div class="decoded-label"><Languages :size="20" /><span>{{ text.decoded }} {{ encoding.toUpperCase() }}</span></div>
      <div class="decoded-content">
        <output>{{ result.text || text.waiting }}</output>
        <button class="copy-result" type="button" :title="text.copy" :disabled="!result.text" @click="copyValue(result.text, text.decoded)">
          <Copy :size="18" />
        </button>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, defineComponent, h, ref } from "vue";
import { ElMessage } from "element-plus";
import { AlertCircle, AlertTriangle, Copy, FileText, Info, Languages, Network, RotateCcw } from "lucide-vue-next";

const text = {
  title: "\u6a21\u62df\u5df4\u6c49\u5b57\u89e3\u6790",
  subtitle: "\u63d0\u53d6\u5bc4\u5b58\u5668\u6570\u636e\u533a\uff0c\u8fd8\u539f\u5b57\u8282\u5e8f\u5e76\u89e3\u7801\u4e3a\u6c49\u5b57\u3002",
  example: "\u52a0\u8f7d\u793a\u4f8b",
  reset: "\u6e05\u7a7a",
  protocol: "\u534f\u8bae\u7c7b\u578b",
  encoding: "\u5b57\u7b26\u7f16\u7801",
  packet: "\u63a5\u6536\u5230\u7684\u5341\u516d\u8fdb\u5236\u62a5\u6587",
  placeholder: "00 A1 00 00 00 23 01 04 20 ...",
  extract: "\u6570\u636e\u533a\u63d0\u53d6",
  swap: "CD AB \u5b57\u8282\u4ea4\u6362",
  trim: "\u5c3e\u90e8 00 \u6e05\u9664",
  decoded: "\u89e3\u7801\u7ed3\u679c",
  copy: "\u590d\u5236",
  waiting: "\u7b49\u5f85\u8f93\u5165\u62a5\u6587",
  swapHelp: "\u6bcf 2 \u4e2a\u5b57\u8282\u4e92\u6362\u4f4d\u7f6e",
  padded: "\u8f93\u5165\u4e3a\u5947\u6570\u5b57\u8282\uff0c\u5df2\u5728\u672b\u5c3e\u81ea\u52a8\u8865 00",
};

const protocolOptions = [{ value: "tcp", label: "Modbus TCP" }, { value: "rtu", label: "Modbus RTU" }];
const encodingOptions = [{ value: "utf-8", label: "UTF-8" }, { value: "gbk", label: "GBK" }];
const examplePacket = "00 A1 00 00 00 23 01 04 20 9C E6 E5 BA A8 99 BA E4 31 BA B4 E7 E6 A7 A5 80 81 E5 E6 9C A2 AD E8 31 AB A2 A7 E8 E5 A6 91 8F";

const protocol = ref("tcp");
const encoding = ref("utf-8");
const packet = ref(examplePacket);

const HexOutput = defineComponent({
  props: { value: { type: String, default: "" }, copyLabel: { type: String, required: true } },
  emits: ["copy"],
  setup(props, { emit }) {
    return () => h("div", { class: "hex-output" }, [
      h("code", props.value || "--"),
      h("button", { class: "hex-copy", type: "button", title: props.copyLabel, disabled: !props.value, onClick: () => emit("copy") }, [h(Copy, { size: 16 })]),
    ]);
  },
});

const result = computed(() => parsePacket(packet.value, protocol.value, encoding.value));
const protocolHint = computed(() => protocol.value === "tcp" ? "TCP \u6a21\u5f0f\u8df3\u8fc7 MBAP \u62a5\u5934\u3001\u529f\u80fd\u7801\u4e0e\u5b57\u8282\u8ba1\u6570\uff0c\u5171 9 \u5b57\u8282\u3002" : "RTU \u6a21\u5f0f\u8df3\u8fc7\u524d 3 \u5b57\u8282\uff0c\u5e76\u4e22\u5f03\u672b\u5c3e 2 \u5b57\u8282 CRC\u3002");
const extractionMeta = computed(() => {
  if (result.value.error || !packet.value.trim()) return "--";
  return protocol.value === "tcp" ? `\u5df2\u8df3\u8fc7\u524d 9 \u5b57\u8282\uff0c\u5171 ${result.value.dataBytes.length} \u5b57\u8282` : `\u5df2\u8df3\u8fc7\u5934\u90e8\u4e0e CRC\uff0c\u5171 ${result.value.dataBytes.length} \u5b57\u8282`;
});
const trimMeta = computed(() => {
  if (result.value.error || !packet.value.trim()) return "--";
  return result.value.trimmedCount ? `\u5df2\u4ece\u5c3e\u90e8\u6e05\u9664 ${result.value.trimmedCount} \u4e2a 00` : "\u672a\u53d1\u73b0\u5c3e\u90e8 00";
});

function parsePacket(rawPacket, selectedProtocol, selectedEncoding) {
  const empty = { dataBytes: [], dataHex: "", swappedHex: "", trimmedHex: "", text: "", error: "", warning: "", wasPadded: false, trimmedCount: 0 };
  if (!rawPacket.trim()) return empty;
  const parsed = parseHex(rawPacket);
  if (parsed.error) return { ...empty, error: parsed.error };
  const headerLength = selectedProtocol === "tcp" ? 9 : 3;
  const crcLength = selectedProtocol === "rtu" ? 2 : 0;
  if (parsed.bytes.length <= headerLength + crcLength) {
    return { ...empty, error: `\u62a5\u6587\u957f\u5ea6\u4e0d\u8db3\uff1a${selectedProtocol === "tcp" ? "TCP \u81f3\u5c11\u9700\u8981 10" : "RTU \u81f3\u5c11\u9700\u8981 6"} \u4e2a\u5b57\u8282\u3002` };
  }
  const dataBytes = parsed.bytes.slice(headerLength, parsed.bytes.length - crcLength);
  const bytesToSwap = [...dataBytes];
  const wasPadded = bytesToSwap.length % 2 === 1;
  if (wasPadded) bytesToSwap.push(0);
  const swapped = [];
  for (let index = 0; index < bytesToSwap.length; index += 2) swapped.push(bytesToSwap[index + 1], bytesToSwap[index]);
  let trimEnd = swapped.length;
  while (trimEnd > 0 && swapped[trimEnd - 1] === 0) trimEnd -= 1;
  const trimmed = swapped.slice(0, trimEnd);
  const decoded = decodeBytes(trimmed, selectedEncoding);
  return {
    dataBytes,
    dataHex: formatHex(dataBytes),
    swappedHex: formatHex(swapped),
    trimmedHex: formatHex(trimmed),
    text: decoded.text,
    error: decoded.error,
    warning: wasPadded ? "\u5b57\u8282\u6570\u4e3a\u5947\u6570\uff0c\u5df2\u81ea\u52a8\u8865 00 \u540e\u7ee7\u7eed\u89e3\u6790\u3002" : "",
    wasPadded,
    trimmedCount: swapped.length - trimEnd,
  };
}

function parseHex(value) {
  const compact = value.replace(/[\s,;:_-]/g, "");
  if (!compact) return { bytes: [], error: "\u8bf7\u8f93\u5165\u62a5\u6587\u3002" };
  if (!/^[0-9a-f]+$/i.test(compact)) return { bytes: [], error: "\u62a5\u6587\u53ea\u80fd\u5305\u542b\u5341\u516d\u8fdb\u5236\u5b57\u7b26\u548c\u5206\u9694\u7b26\u3002" };
  if (compact.length % 2) return { bytes: [], error: "\u5341\u516d\u8fdb\u5236\u5b57\u7b26\u6570\u5fc5\u987b\u4e3a\u5076\u6570\u3002" };
  return { bytes: Array.from({ length: compact.length / 2 }, (_, index) => Number.parseInt(compact.slice(index * 2, index * 2 + 2), 16)), error: "" };
}

function decodeBytes(bytes, charset) {
  if (!bytes.length) return { text: "", error: "" };
  try {
    return { text: new TextDecoder(charset, { fatal: true }).decode(new Uint8Array(bytes)), error: "" };
  } catch {
    return { text: "", error: `\u65e0\u6cd5\u6309 ${charset.toUpperCase()} \u89e3\u7801\uff0c\u8bf7\u68c0\u67e5\u5b57\u8282\u5e8f\u3001\u534f\u8bae\u7c7b\u578b\u548c\u5b57\u7b26\u96c6\u3002` };
  }
}

function formatHex(bytes) {
  return bytes.map((byte) => byte.toString(16).padStart(2, "0").toUpperCase()).join(" ");
}

function loadExample() {
  protocol.value = "tcp";
  encoding.value = "utf-8";
  packet.value = examplePacket;
}

function resetForm() {
  packet.value = "";
}

async function copyValue(value, label) {
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
    ElMessage.success(`${label}\u5df2\u590d\u5236`);
  } catch {
    ElMessage.error("\u590d\u5236\u5931\u8d25");
  }
}
</script>

<style scoped>
.modbus-tool { width: min(1080px, 100%); margin: 0 auto; display: grid; gap: 16px; padding-bottom: 24px; }
.modbus-header, .decode-panel, .step-card, .decoded-result { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; box-shadow: var(--shadow); }
.modbus-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; padding: 22px; }
.modbus-eyebrow, .decoded-label, .hint-line, .status-message, .step-heading { display: flex; align-items: center; }
.modbus-eyebrow { gap: 7px; color: #0f766e; font-size: 12px; font-weight: 800; letter-spacing: 0; }
.modbus-header h1 { margin: 5px 0 4px; font-size: 24px; line-height: 1.25; }
.modbus-header p { margin: 0; color: var(--muted); }
.header-actions { display: flex; gap: 8px; }
.icon-button, .hex-copy, .copy-result { display: grid; place-items: center; border: 1px solid #cbd5e1; border-radius: 7px; background: #fff; color: #334155; cursor: pointer; }
.icon-button { width: 38px; height: 38px; }
.icon-button:hover, .hex-copy:not(:disabled):hover, .copy-result:not(:disabled):hover { background: #f1f5f9; border-color: #94a3b8; }
.decode-panel { display: grid; gap: 16px; padding: 20px; }
.control-row { display: flex; flex-wrap: wrap; gap: 20px; }
.control-group { display: grid; gap: 7px; }
.control-label, .packet-field > span { color: #334155; font-weight: 800; }
.segment-control { display: inline-flex; gap: 4px; padding: 4px; border: 1px solid #cbd5e1; border-radius: 8px; background: #f8fafc; }
.segment-control button { min-height: 32px; padding: 0 13px; border: 0; border-radius: 5px; background: transparent; color: #475569; font-weight: 750; cursor: pointer; }
.segment-control button.active { background: #fff; color: #0369a1; box-shadow: 0 1px 4px rgba(15, 23, 42, .13); }
.packet-field { display: grid; gap: 7px; }
.packet-field textarea { width: 100%; min-height: 132px; padding: 13px 14px; border: 1px solid #cbd5e1; border-radius: 8px; color: #0f172a; background: #fff; resize: vertical; font: 700 16px/1.55 ui-monospace, SFMono-Regular, Consolas, monospace; word-break: break-all; }
.packet-field textarea:focus { border-color: #0284c7; outline: none; }
.hint-line { gap: 7px; color: #64748b; font-size: 13px; }
.status-message { gap: 8px; margin: 0; padding: 10px 12px; border-radius: 7px; font-weight: 700; }
.is-error { background: #fef2f2; color: #b91c1c; }.is-warning { background: #fffbeb; color: #a16207; }
.steps { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
.step-card { min-width: 0; display: grid; gap: 16px; padding: 18px; }
.step-heading { align-items: flex-start; gap: 10px; }.step-heading > span { color: #0891b2; font: 800 12px/1.5 ui-monospace, monospace; }.step-heading h2 { margin: 0; font-size: 15px; }.step-heading p { min-height: 39px; margin: 3px 0 0; color: #64748b; font-size: 12px; line-height: 1.45; }
.hex-output { min-height: 118px; display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; padding: 11px; border: 1px solid #e2e8f0; border-radius: 7px; background: #f8fafc; }
.hex-output code { overflow-wrap: anywhere; color: #0f172a; font: 700 14px/1.55 ui-monospace, SFMono-Regular, Consolas, monospace; }.hex-copy { flex: 0 0 auto; width: 30px; height: 30px; }.hex-copy:disabled, .copy-result:disabled { cursor: not-allowed; opacity: .45; }
.decoded-result { padding: 20px; border-color: #a7f3d0; background: #f0fdf4; }.decoded-result.empty { border-color: var(--line); background: var(--panel); }
.decoded-label { gap: 8px; color: #047857; font-size: 13px; font-weight: 850; }.decoded-result.empty .decoded-label { color: #64748b; }
.decoded-content { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-top: 10px; }.decoded-content output { min-height: 34px; font-size: 24px; font-weight: 800; line-height: 1.4; overflow-wrap: anywhere; }.copy-result { width: 38px; height: 38px; flex: 0 0 auto; }
@media (max-width: 760px) { .steps { grid-template-columns: 1fr; }.hex-output { min-height: 76px; }.step-heading p { min-height: 0; }.modbus-header { padding: 18px; }.decoded-content output { font-size: 20px; } }
@media (max-width: 480px) { .modbus-header h1 { font-size: 21px; }.control-row { display: grid; grid-template-columns: 1fr; gap: 14px; }.segment-control { width: 100%; }.segment-control button { flex: 1; padding: 0 8px; }.packet-field textarea { font-size: 14px; } }
</style>

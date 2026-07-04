<template>
  <main class="servo-tool">
    <div class="tool-layout">
      <div class="tool-main">
    <section class="panel">
      <div class="panel-head">
        <h1>伺服识别文件生成器</h1>
        <p>上传 EtherCAT XML 伺服描述文件自动解析，或手动填写参数，生成 slaveTypeLib.json。</p>
      </div>
    </section>

    <!-- 伺服条目列表 -->
    <section class="panel">
      <div class="panel-head">
        <h2>伺服条目</h2>
        <p>每个条目对应一个伺服，上传 XML 或手动填写参数</p>
      </div>

      <div class="servo-list">
        <div v-for="(entry, idx) in entries" :key="entry.id" class="servo-card">
          <div class="card-header">
            <span class="card-label">伺服条目{{ idx + 1 }}</span>
            <button
              class="btn-sm danger"
              type="button"
              @click="removeEntry(entry.id)"
              :disabled="entries.length <= 1"
            >删除</button>
          </div>

          <!-- 每个条目的 XML 上传 -->
          <div class="upload-row">
            <button class="btn-sm" type="button" @click="pickXml(idx)">上传 XML 文件</button>
            <input
              :ref="(el) => setFileInput(idx, el)"
              class="file-input-hidden"
              type="file"
              accept=".xml"
              @change="(e) => handleXmlUpload(idx, e)"
            />
            <span v-if="entry.xmlStatus" class="upload-status">{{ entry.xmlStatus }}</span>
          </div>

          <div class="form-grid">
            <label class="field">
              <span>标识名 (name)</span>
              <input v-model="entry.name" type="text" placeholder="如 Maxsine_EP5E" />
            </label>

            <label class="field">
              <span>中文名 (chineseName)</span>
              <input v-model="entry.chineseName" type="text" placeholder="如 迈信伺服" />
            </label>

            <label class="field">
              <span>轴数 (axisNum)</span>
              <input v-model.number="entry.axisNum" type="number" min="1" />
            </label>

            <label class="field">
              <span>编码器清除模式</span>
              <select v-model.number="entry.clearEncodeMode">
                <option :value="0">0 - 不清除</option>
                <option :value="1">1 - 清除</option>
              </select>
            </label>

            <label class="field">
              <span>Vendor ID（十进制值）</span>
              <input
                v-model="entry.vendorIDInput"
                type="text"
                placeholder="输入十进制值，如 2013"
                @blur="() => convertHex(idx, 'vendorID')"
              />
            </label>

            <label class="field">
              <span>Product Code（十进制值）</span>
              <input
                v-model="entry.productcodeInput"
                type="text"
                placeholder="输入十进制值，如 1342177281"
                @blur="() => convertHex(idx, 'productcode')"
              />
            </label>
          </div>
        </div>
      </div>

      <div class="actions">
        <button class="btn" type="button" @click="addEntry">+ 添加伺服</button>
        <button class="btn primary" type="button" @click="downloadJson">下载 JSON</button>
      </div>
    </section>

    <!-- JSON 预览 -->
    <section class="panel">
      <div class="panel-head preview-head">
        <div class="collapsible" @click="showPreview = !showPreview">
          <h2>JSON 预览</h2>
          <span class="toggle-icon">{{ showPreview ? '▾' : '▸' }}</span>
        </div>
        <button class="btn-sm" type="button" @click.stop="copyJson" :disabled="btnLoading">
          {{ btnLoading === 'copy' ? '复制中…' : '复制' }}
        </button>
        <button class="btn-sm" type="button" @click.stop="downloadJson" :disabled="btnLoading">
          {{ btnLoading === 'export' ? '导出中…' : '导出' }}
        </button>
      </div>
      <pre v-if="showPreview" class="json-preview"><code>{{ generatedJson }}</code></pre>
    </section>

    <section v-if="errorMsg" class="panel error-panel">
      <p>{{ errorMsg }}</p>
    </section>
    </div>

    <!-- 右侧：进制转换 + 参数说明 -->
    <aside class="tool-sidebar">
      <section class="panel converter-panel">
        <h3>进制转换</h3>
        <div class="radio-row">
          <label class="radio-item">
            <input v-model="convMode" type="radio" value="hex2dec" />
            <span>十六 → 十</span>
          </label>
          <label class="radio-item">
            <input v-model="convMode" type="radio" value="dec2hex" />
            <span>十 → 十六</span>
          </label>
        </div>
        <label class="field">
          <span>{{ convMode === 'hex2dec' ? '十六进制' : '十进制' }}</span>
          <input v-model="convInput" type="text" :placeholder="convMode === 'hex2dec' ? '如 7DD 或 0x7DD' : '如 2013'" @input="onConvInput" />
        </label>
        <label class="field">
          <span>{{ convMode === 'hex2dec' ? '十进制' : '十六进制' }}</span>
          <input :value="convResult" type="text" readonly placeholder="—" />
        </label>
        <button class="btn-sm copy-btn" type="button" @click="copyConvResult" :disabled="!convResult">复制结果</button>
      </section>

      <section class="panel param-ref">
        <h3 @click="showParamRef = !showParamRef" class="param-ref-toggle">
          参数说明
          <span class="toggle-icon">{{ showParamRef ? '▾' : '▸' }}</span>
        </h3>
        <dl v-if="showParamRef" class="param-list">
          <dt>name</dt>
          <dd>设备型号/唯一标识，英文+数字+下划线组合。</dd>

          <dt>chineseName</dt>
          <dd>中文名称，UI 界面展示用。</dd>

          <dt>axisNum</dt>
          <dd>电机轴数。1 = 单轴，3 = 三轴。</dd>

          <dt>vendorID</dt>
          <dd>厂商识别码（Vendor ID），EtherCAT/CANopen 协议中标识硬件厂家。</dd>

          <dt>productcode</dt>
          <dd>产品代码（Product Code），与 vendorID 配合标识具体型号。</dd>

          <dt>clearEncodeMode</dt>
          <dd>编码器清除模式。0 = 默认/标准模式。</dd>
        </dl>
      </section>
    </aside>
    </div>

    <teleport to="body">
      <div v-if="toast.visible" class="servo-toast">{{ toast.message }}</div>
    </teleport>
  </main>
</template>

<script setup>
import { computed, ref, reactive, watch } from "vue";

/* ---------- 工具函数 ---------- */

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function parseHexOrDec(raw) {
  if (!raw || !raw.trim()) return null;
  let s = raw.trim();
  if (s.startsWith("#x") || s.startsWith("#X")) s = s.slice(2);
  else if (s.startsWith("0x") || s.startsWith("0X")) s = s.slice(2);
  else if (/^\d+$/.test(s)) return parseInt(s, 10);

  if (/^[0-9a-fA-F]+$/.test(s)) return parseInt(s, 16);
  return null;
}

function parseXmlForServo(xmlText) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, "text/xml");
    if (doc.querySelector("parsererror")) return null;

    const vendorIdEl = doc.querySelector("Vendor > Id");
    let vendorID = null;
    if (vendorIdEl) vendorID = parseHexOrDec(vendorIdEl.textContent.trim());

    const typeEl = doc.querySelector("Device > Type");
    let productcode = null, typeName = "";
    if (typeEl) {
      const pc = typeEl.getAttribute("ProductCode");
      if (pc) productcode = parseHexOrDec(pc);
      typeName = typeEl.textContent.trim();
    }

    return { vendorID, productcode, typeName };
  } catch {
    return null;
  }
}

/* ---------- 数据 ---------- */

const showPreview = ref(true);
const showParamRef = ref(true);
const errorMsg = ref("");
const btnLoading = ref(null); // 'copy' | 'export' | null
const toast = reactive({ visible: false, message: "" });
const fileInputs = ref([]);

function setFileInput(idx, el) {
  if (el) fileInputs.value[idx] = el;
}

function createEntry() {
  return reactive({
    id: makeId(),
    name: "",
    chineseName: "",
    axisNum: 1,
    clearEncodeMode: 0,
    vendorID: null,
    vendorIDInput: "",
    productcode: null,
    productcodeInput: "",
    xmlStatus: "",
  });
}

const entries = ref([createEntry()]);

/* ---------- 条目管理 ---------- */

function addEntry() {
  entries.value.push(createEntry());
}

function removeEntry(id) {
  if (entries.value.length <= 1) return;
  const idx = entries.value.findIndex((e) => e.id === id);
  if (idx !== -1) entries.value.splice(idx, 1);
}

/* ---------- XML 上传（按条目索引） ---------- */

function pickXml(idx) {
  fileInputs.value[idx]?.click();
}

function handleXmlUpload(idx, e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const entry = entries.value[idx];
  if (!entry) return;

  entry.xmlStatus = `正在解析 ${file.name}…`;
  errorMsg.value = "";

  const reader = new FileReader();
  reader.onload = () => {
    const result = parseXmlForServo(reader.result);
    if (!result) {
      entry.xmlStatus = "";
      errorMsg.value = "XML 解析失败，请确认文件是有效的 EtherCAT 描述文件。";
      return;
    }
    if (result.vendorID !== null) {
      entry.vendorID = result.vendorID;
      entry.vendorIDInput = String(result.vendorID);
    }
    if (result.productcode !== null) {
      entry.productcode = result.productcode;
      entry.productcodeInput = String(result.productcode);
    }
    if (result.typeName && !entry.name) {
      entry.name = result.typeName.replace(/\s+/g, "_");
    }
    entry.xmlStatus = `已解析: Vendor=0x${result.vendorID?.toString(16).toUpperCase()}, Product=0x${result.productcode?.toString(16).toUpperCase()}`;
    e.target.value = "";
  };
  reader.onerror = () => {
    entry.xmlStatus = "";
    errorMsg.value = "文件读取失败，请重试。";
  };
  reader.readAsText(file);
}

/* ---------- Hex 转换 ---------- */

function convertHex(idx, field) {
  const entry = entries.value[idx];
  if (!entry) return;
  const inputField = field === "vendorID" ? "vendorIDInput" : "productcodeInput";
  const val = parseHexOrDec(entry[inputField]);
  if (val !== null) {
    entry[field] = val;
    entry[inputField] = String(val);
  } else if (!entry[inputField]) {
    entry[field] = null;
    entry[inputField] = "";
  }
}

/* ---------- JSON 生成 ---------- */

const generatedJson = computed(() => {
  const servo = {};
  for (const entry of entries.value) {
    const name = entry.name || `servo_${entry.id}`;
    servo[name] = {
      axisNum: entry.axisNum ?? 1,
      chineseName: entry.chineseName || "",
      clearEncodeMode: entry.clearEncodeMode ?? 0,
      name,
      productcode: entry.productcode ?? 0,
      vendorID: entry.vendorID ?? 0,
    };
  }
  return JSON.stringify({ servo, version: "1.0.0" }, null, 2);
});

function downloadJson() {
  btnLoading.value = "export";
  // 用微任务确保 UI 更新后再执行
  setTimeout(() => {
    const blob = new Blob([generatedJson.value], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "slaveTypeLib.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    btnLoading.value = null;
  }, 100);
}

async function copyJson() {
  btnLoading.value = "copy";
  await new Promise((r) => setTimeout(r, 100));
  try {
    await navigator.clipboard.writeText(generatedJson.value);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = generatedJson.value;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
  btnLoading.value = null;
  showToast("复制成功");
}

let toastTimer = null;
function showToast(msg) {
  clearTimeout(toastTimer);
  toast.message = msg;
  toast.visible = true;
  toastTimer = setTimeout(() => { toast.visible = false; }, 1500);
}

/* ---------- 进制转换 ---------- */

const convMode = ref("hex2dec");
const convInput = ref("");
const convResult = ref("");

function onConvInput() {
  if (convMode.value === "hex2dec") {
    const val = parseHexOrDec(convInput.value);
    convResult.value = val !== null ? String(val) : "";
  } else {
    const raw = convInput.value.trim();
    if (/^\d+$/.test(raw)) {
      const num = parseInt(raw, 10);
      convResult.value = "0x" + num.toString(16).toUpperCase();
    } else {
      convResult.value = "";
    }
  }
}

function copyConvResult() {
  if (!convResult.value) return;
  navigator.clipboard.writeText(convResult.value).catch(() => {});
  showToast("复制成功");
}

// Reset when switching mode
watch(convMode, () => {
  convInput.value = "";
  convResult.value = "";
});
</script>

<style scoped>
.servo-tool { display: grid; gap: 16px; }

.tool-layout {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 16px;
  align-items: start;
}

.tool-main {
  display: grid;
  gap: 16px;
  min-width: 0;
}

.tool-sidebar {
  position: sticky;
  top: 16px;
  display: grid;
  gap: 16px;
}

.panel {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 8px;
  box-shadow: var(--shadow);
  padding: 18px;
}

.panel-head h2, .panel-head h1 { margin: 0; font-size: 20px; }
.panel-head p { margin: 4px 0 0; color: var(--muted); }

.collapsible { display: flex; align-items: center; justify-content: space-between; cursor: pointer; user-select: none; flex: 1; }
.preview-head { display: flex; align-items: center; gap: 12px; }
.toggle-icon { color: var(--muted); font-size: 16px; }

.servo-list { display: grid; gap: 12px; margin-top: 12px; }

.servo-card { border: 1px solid var(--line); border-radius: 8px; padding: 14px; background: #fbfcfe; }

.card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.card-label { font-weight: 700; color: var(--primary); }

.upload-row { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.file-input-hidden { display: none; }
.upload-status { color: var(--muted); font-size: 12px; }

.form-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }

.field { display: grid; gap: 4px; }
.field span { font-size: 13px; color: var(--muted); }
.field span em { font-style: normal; font-weight: 600; color: var(--text); }
.field input, .field select {
  padding: 7px 10px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: #fff;
  color: var(--text);
}
.field input:focus, .field select:focus {
  border-color: var(--primary);
  outline: none;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.actions { display: flex; gap: 10px; margin-top: 14px; flex-wrap: wrap; }

.btn {
  padding: 7px 16px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: #fff;
  color: var(--text);
  cursor: pointer;
  font-weight: 600;
}
.btn:hover { background: #f3f4f6; }
.btn.primary { background: var(--primary); color: #fff; border-color: var(--primary); }
.btn.primary:hover { background: #1d4ed8; }

.btn-sm {
  padding: 4px 12px;
  border: 1px solid var(--line);
  border-radius: 5px;
  background: #fff;
  color: var(--text);
  cursor: pointer;
  font-size: 13px;
}
.btn-sm:hover { background: #f3f4f6; }
.btn-sm.danger { color: #dc2626; border-color: #fecaca; }
.btn-sm.danger:hover { background: #fef2f2; }
.btn-sm:disabled { opacity: 0.4; cursor: not-allowed; }

.json-preview {
  margin: 12px 0 0;
  padding: 14px;
  background: #f8f9fb;
  border: 1px solid var(--line);
  border-radius: 6px;
  font-size: 13px;
  overflow-x: auto;
  white-space: pre;
}
.json-preview code { font-family: "SF Mono", "Fira Code", monospace; }

.error-panel { border-color: #fecaca; background: #fef2f2; color: #dc2626; }
.error-panel p { margin: 0; }

@media (max-width: 640px) {
  .form-grid { grid-template-columns: 1fr; }

  .panel { padding: 14px; }
  .panel-head h2, .panel-head h1 { font-size: 17px; }

  .upload-row { flex-wrap: wrap; }
  .upload-status { width: 100%; }

  .preview-head { flex-wrap: wrap; }

  .json-preview { font-size: 11px; padding: 10px; }

  .actions { flex-direction: column; }
  .actions .btn { width: 100%; }

  .radio-row { flex-direction: column; }

  .servo-card { padding: 12px; }

  .card-header { flex-wrap: wrap; gap: 8px; }
}

@media (max-width: 900px) {
  .tool-layout {
    grid-template-columns: 1fr;
  }

  .tool-sidebar {
    position: static;
  }
}

/* 进制转换面板 */
.converter-panel h3 {
  margin: 0 0 12px;
  font-size: 16px;
}

.radio-row {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
}

.radio-item {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 8px;
  border: 1px solid var(--line);
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: border-color 0.15s, background 0.15s;
}

.radio-item:has(input:checked) {
  border-color: var(--primary);
  background: #eef2ff;
}

.radio-item input {
  accent-color: var(--primary);
  margin: 0;
}

.converter-panel .field {
  margin-bottom: 10px;
}

.copy-btn {
  width: 100%;
  margin-top: 4px;
}

/* 参数说明 */
.param-ref {
  margin-top: 0;
}

.param-ref-toggle {
  margin: 0;
  font-size: 16px;
  cursor: pointer;
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.param-list {
  margin: 12px 0 0;
  display: grid;
  gap: 10px;
}

.param-list dt {
  font-weight: 700;
  font-size: 12px;
  color: var(--primary);
  margin-bottom: 2px;
  font-family: "SF Mono", "Fira Code", monospace;
}

.param-list dd {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.6;
}

</style>

<style>
.servo-toast {
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  max-width: calc(100vw - 32px);
  padding: 10px 24px;
  border-radius: 8px;
  background: #1f2937;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
  z-index: 9999;
  animation: toast-in 0.25s ease;
  pointer-events: none;
  white-space: nowrap;
  text-align: center;
}

@keyframes toast-in {
  from { opacity: 0; transform: translateX(-50%) translateY(-8px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}
</style>

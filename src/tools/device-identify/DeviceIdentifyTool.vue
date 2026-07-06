<template>
  <main class="device-tool">
    <div class="tool-layout">
      <div class="tool-main">
        <section class="panel">
          <div class="panel-head">
            <h1>设备识别文件生成器</h1>
            <p>上传 EtherCAT XML / ESI 描述文件自动解析，或手动填写参数，生成 slaveTypeLib.json。</p>
          </div>
        </section>

        <!-- 设备条目列表 -->
        <section class="panel">
          <div class="panel-head">
            <h2>设备条目</h2>
            <p>每个条目对应一个设备，通过下拉框选择伺服或 IO 类型</p>
          </div>

          <div class="device-list">
            <div v-for="(entry, idx) in entries" :key="entry.id" class="device-card">
              <div class="card-header">
                <div class="card-header-left">
                  <span class="card-label">设备条目 {{ idx + 1 }}</span>
                  <select v-model="entry.type" class="type-select">
                    <option value="servo">伺服</option>
                    <option value="gpio">IO</option>
                  </select>
                </div>
                <button
                  class="btn-sm danger"
                  type="button"
                  @click="removeEntry(entry.id)"
                  :disabled="entries.length <= 1"
                >删除</button>
              </div>

              <!-- ====== 伺服模式 ====== -->
              <template v-if="entry.type === 'servo'">
                <!-- XML 上传 -->
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
                      <option :value="2">2</option>
                    </select>
                  </label>
                  <label class="field">
                    <span>Vendor ID（十进制值）</span>
                    <input
                      v-model="entry.vendorIDInput"
                      type="text"
                      placeholder="输入十进制值，如 2013"
                      @blur="() => convertHex(idx)"
                    />
                  </label>
                  <label class="field">
                    <span>Product Code（十进制值）</span>
                    <input
                      v-model="entry.productcodeInput"
                      type="text"
                      placeholder="输入十进制值，如 1342177281"
                      @blur="() => convertHex(idx)"
                    />
                  </label>
                </div>
              </template>

              <!-- ====== IO 模式 ====== -->
              <template v-if="entry.type === 'gpio'">
                <!-- ESI XML 上传 -->
                <div class="upload-row">
                  <button class="btn-sm" type="button" @click="pickXml(idx)">上传 ESI 文件</button>
                  <input
                    :ref="(el) => setFileInput(idx, el)"
                    class="file-input-hidden"
                    type="file"
                    accept=".xml"
                    @change="(e) => handleXmlUpload(idx, e)"
                  />
                  <span v-if="entry.xmlStatus" class="upload-status">{{ entry.xmlStatus }}</span>
                </div>

                <!-- 基本信息 -->
                <div class="section-title">基本信息</div>
                <div class="form-grid">
                  <label class="field">
                    <span>标识名 (name) <em>不含中文</em></span>
                    <input v-model="entry.name" type="text" placeholder="如 EC4_1616BW" />
                  </label>
                  <label class="field">
                    <span>中文名 (chineseName)</span>
                    <input v-model="entry.chineseName" type="text" placeholder="如 EC4_1616BW" />
                  </label>
                  <label class="field">
                    <span>Vendor ID（十进制）</span>
                    <input
                      v-model="entry.vendorIDInput"
                      type="text"
                      placeholder="EC 中为 16 进制，自动转 10 进制"
                      @blur="() => convertHex(idx)"
                    />
                  </label>
                  <label class="field">
                    <span>Product Code（十进制）</span>
                    <input
                      v-model="entry.productcodeInput"
                      type="text"
                      placeholder="EC 中为 16 进制，自动转 10 进制"
                      @blur="() => convertHex(idx)"
                    />
                  </label>
                  <label class="field">
                    <span>AD 比例 (AD_ratio)</span>
                    <input v-model.number="entry.AD_ratio" type="number" min="1" />
                  </label>
                </div>

                <!-- 模拟量输入 (AI) -->
                <div class="section-title collapsible-section" @click="entry.showAI = !entry.showAI">
                  <span>模拟量输入 (AI)</span>
                  <span class="section-badge" v-if="entry.AI.length === 0">无</span>
                  <span class="section-badge has-items" v-else>{{ entry.AI.length }} 组</span>
                  <span class="toggle-icon-sm">{{ entry.showAI ? '▾' : '▸' }}</span>
                </div>
                <template v-if="entry.showAI">
                  <div v-for="(ai, aiIdx) in entry.AI" :key="ai._key" class="pdo-row">
                    <span class="pdo-label">AI #{{ aiIdx + 1 }}</span>
                    <label class="field-inline">
                      <span>bitnum</span>
                      <input v-model.number="ai.bitnum" type="number" min="1" />
                    </label>
                    <label class="field-inline">
                      <span>index (十进制)</span>
                      <input v-model.number="ai.index" type="number" min="0" />
                    </label>
                    <label class="field-inline">
                      <span>subindex</span>
                      <input v-model.number="ai.subindex" type="number" min="0" />
                    </label>
                    <button class="btn-sm danger" type="button" @click="removePdoEntry(entry.AI, aiIdx)">×</button>
                  </div>
                  <button class="btn-sm add-pdo-btn" type="button" @click="addAiEntry(entry)">+ 添加 AI</button>
                </template>

                <!-- 模拟量输出 (AO) -->
                <div class="section-title collapsible-section" @click="entry.showAO = !entry.showAO">
                  <span>模拟量输出 (AO)</span>
                  <span class="section-badge" v-if="entry.AO.length === 0">无</span>
                  <span class="section-badge has-items" v-else>{{ entry.AO.length }} 组</span>
                  <span class="toggle-icon-sm">{{ entry.showAO ? '▾' : '▸' }}</span>
                </div>
                <template v-if="entry.showAO">
                  <div v-for="(ao, aoIdx) in entry.AO" :key="ao._key" class="pdo-row">
                    <span class="pdo-label">AO #{{ aoIdx + 1 }}</span>
                    <label class="field-inline">
                      <span>bitnum</span>
                      <input v-model.number="ao.bitnum" type="number" min="1" />
                    </label>
                    <label class="field-inline">
                      <span>index (十进制)</span>
                      <input v-model.number="ao.index" type="number" min="0" />
                    </label>
                    <label class="field-inline">
                      <span>subindex</span>
                      <input v-model.number="ao.subindex" type="number" min="0" />
                    </label>
                    <button class="btn-sm danger" type="button" @click="removePdoEntry(entry.AO, aoIdx)">×</button>
                  </div>
                  <button class="btn-sm add-pdo-btn" type="button" @click="addAoEntry(entry)">+ 添加 AO</button>
                </template>

                <!-- 数字量输入 (DI) -->
                <div class="section-title">
                  <span>数字量输入 (DI)</span>
                  <span class="section-badge has-items">{{ diSummary(entry) }}</span>
                </div>
                <div v-for="(di, diIdx) in entry.DI" :key="di._key" class="pdo-row">
                  <span class="pdo-label">DI #{{ diIdx + 1 }}</span>
                  <label class="field-inline">
                    <span>bitnum</span>
                    <input v-model.number="di.bitnum" type="number" min="1" />
                  </label>
                  <label class="field-inline">
                    <span>portnum</span>
                    <input v-model.number="di.portnum" type="number" min="1" />
                  </label>
                  <label class="field-inline">
                    <span>index (0x6000→24576)</span>
                    <input v-model.number="di.index" type="number" min="0" />
                  </label>
                  <label class="field-inline">
                    <span>subindex</span>
                    <input v-model.number="di.subindex" type="number" min="0" />
                  </label>
                  <button class="btn-sm danger" type="button" @click="removePdoEntry(entry.DI, diIdx)">×</button>
                </div>
                <button class="btn-sm add-pdo-btn" type="button" @click="addDiEntry(entry)">+ 添加 DI</button>

                <!-- 数字量输出 (DO) -->
                <div class="section-title">
                  <span>数字量输出 (DO)</span>
                  <span class="section-badge has-items">{{ doSummary(entry) }}</span>
                </div>
                <div v-for="(doItem, doIdx) in entry.DO" :key="doItem._key" class="pdo-row">
                  <span class="pdo-label">DO #{{ doIdx + 1 }}</span>
                  <label class="field-inline">
                    <span>bitnum</span>
                    <input v-model.number="doItem.bitnum" type="number" min="1" />
                  </label>
                  <label class="field-inline">
                    <span>portnum</span>
                    <input v-model.number="doItem.portnum" type="number" min="1" />
                  </label>
                  <label class="field-inline">
                    <span>index (0x7000→28672)</span>
                    <input v-model.number="doItem.index" type="number" min="0" />
                  </label>
                  <label class="field-inline">
                    <span>subindex</span>
                    <input v-model.number="doItem.subindex" type="number" min="0" />
                  </label>
                  <button class="btn-sm danger" type="button" @click="removePdoEntry(entry.DO, doIdx)">×</button>
                </div>
                <button class="btn-sm add-pdo-btn" type="button" @click="addDoEntry(entry)">+ 添加 DO</button>
              </template>
            </div>
          </div>

          <div class="actions">
            <button class="btn" type="button" @click="addEntry('servo')">+ 添加伺服</button>
            <button class="btn" type="button" @click="addEntry('gpio')">+ 添加 IO</button>
            <button class="btn primary" type="button" @click="downloadJson">下载 JSON</button>
          </div>

          <!-- 条目类型统计 -->
          <div v-if="typeStats" class="type-stats">
            <span>伺服 {{ typeStats.servo }} 个</span>
            <span class="stats-sep">|</span>
            <span>IO {{ typeStats.gpio }} 个</span>
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

      <!-- 右侧栏 -->
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

        <section class="panel quick-ref">
          <h3>常用 index 速查 (IO)</h3>
          <table class="ref-table">
            <thead>
              <tr><th>十六进制</th><th>十进制</th><th>说明</th></tr>
            </thead>
            <tbody>
              <tr><td><code>0x6000</code></td><td>24576</td><td>DI 输入 PDO</td></tr>
              <tr><td><code>0x7000</code></td><td>28672</td><td>DO 输出 PDO</td></tr>
              <tr><td><code>0x6001</code></td><td>24577</td><td>DI 第二组</td></tr>
              <tr><td><code>0x7001</code></td><td>28673</td><td>DO 第二组</td></tr>
            </tbody>
          </table>
        </section>

        <section class="panel param-ref">
          <h3 @click="showParamRef = !showParamRef" class="param-ref-toggle">
            参数说明
            <span class="toggle-icon">{{ showParamRef ? '▾' : '▸' }}</span>
          </h3>
          <dl v-if="showParamRef" class="param-list">
            <dt class="param-section">通用</dt>
            <dt>name</dt>
            <dd>设备型号/唯一标识，英文+数字+下划线。IO 类型不能含中文。</dd>
            <dt>chineseName</dt>
            <dd>中文名称，UI 展示用。</dd>
            <dt>vendorID</dt>
            <dd>厂商识别码。EC 软件中为 16 进制，需转 10 进制。</dd>
            <dt>productcode</dt>
            <dd>产品代码。EC 软件中为 16 进制，需转 10 进制。</dd>
            <dt class="param-section">伺服</dt>
            <dt>axisNum</dt>
            <dd>电机轴数。1 = 单轴，3 = 三轴。</dd>
            <dt>clearEncodeMode</dt>
            <dd>编码器清除模式。0 = 默认/标准模式。</dd>
            <dt class="param-section">IO</dt>
            <dt>AD_ratio</dt>
            <dd>模拟量比例系数，默认 1000。</dd>
            <dt>AI / AO</dt>
            <dd>模拟量输入/输出配置。无模拟量时为空数组。</dd>
            <dt>DI</dt>
            <dd>数字量输入。index 来自 0x6000 段，subindex 填 1。</dd>
            <dt>DO</dt>
            <dd>数字量输出。index 来自 0x7000 段，subindex 填 1。</dd>
          </dl>
        </section>
      </aside>
    </div>

    <teleport to="body">
      <div v-if="toast.visible" class="device-toast">{{ toast.message }}</div>
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

function parseDeviceXml(xmlText) {
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

    // PDO indices for IO boards
    const pdoIndices = { di: [], do: [] };
    const txPdoIndexes = doc.querySelectorAll("TxPdo > Index");
    txPdoIndexes.forEach((el) => {
      const val = parseHexOrDec(el.textContent.trim());
      if (val !== null) pdoIndices.di.push(val);
    });
    const rxPdoIndexes = doc.querySelectorAll("RxPdo > Index");
    rxPdoIndexes.forEach((el) => {
      const val = parseHexOrDec(el.textContent.trim());
      if (val !== null) pdoIndices.do.push(val);
    });

    return { vendorID, productcode, typeName, pdoIndices };
  } catch {
    return null;
  }
}

/* ---------- 数据 ---------- */

const showPreview = ref(true);
const showParamRef = ref(true);
const errorMsg = ref("");
const btnLoading = ref(null);
const toast = reactive({ visible: false, message: "" });
const fileInputs = ref([]);

function setFileInput(idx, el) {
  if (el) fileInputs.value[idx] = el;
}

function createPdoEntry(defaults = {}) {
  return reactive({
    _key: makeId(),
    bitnum: defaults.bitnum ?? 0,
    index: defaults.index ?? 0,
    portnum: defaults.portnum ?? 0,
    subindex: defaults.subindex ?? 1,
  });
}

function createEntry(type = "servo") {
  // Always include ALL properties for both types so switching via dropdown works
  return reactive({
    id: makeId(),
    type,
    name: "",
    chineseName: "",
    vendorID: null,
    vendorIDInput: "",
    productcode: null,
    productcodeInput: "",
    xmlStatus: "",
    // 伺服专属
    axisNum: 1,
    clearEncodeMode: 0,
    // IO 专属
    AD_ratio: 1000,
    AI: [],
    AO: [],
    DI: [createPdoEntry({ index: 24576, subindex: 1 })],
    DO: [createPdoEntry({ index: 28672, subindex: 1 })],
    showAI: false,
    showAO: false,
  });
}

const entries = ref([createEntry("servo")]);

/* ---------- 类型统计 ---------- */

const typeStats = computed(() => {
  const servo = entries.value.filter((e) => e.type === "servo").length;
  const gpio = entries.value.filter((e) => e.type === "gpio").length;
  return { servo, gpio };
});

/* ---------- 条目管理 ---------- */

function addEntry(type) {
  entries.value.push(createEntry(type));
}

function removeEntry(id) {
  if (entries.value.length <= 1) return;
  const idx = entries.value.findIndex((e) => e.id === id);
  if (idx !== -1) entries.value.splice(idx, 1);
}

/* ---------- PDO（仅 IO）---------- */

function addDiEntry(entry) {
  entry.DI.push(createPdoEntry({ index: 24576, subindex: 1 }));
}

function addDoEntry(entry) {
  entry.DO.push(createPdoEntry({ index: 28672, subindex: 1 }));
}

function addAiEntry(entry) {
  entry.AI.push(createPdoEntry({ subindex: 1 }));
}

function addAoEntry(entry) {
  entry.AO.push(createPdoEntry({ subindex: 1 }));
}

function removePdoEntry(list, idx) {
  list.splice(idx, 1);
}

function diSummary(entry) {
  const totalBit = entry.DI.reduce((s, d) => s + (d.bitnum || 0), 0);
  const totalPort = entry.DI.reduce((s, d) => s + (d.portnum || 0), 0);
  return `${entry.DI.length} 组 / bit=${totalBit} port=${totalPort}`;
}

function doSummary(entry) {
  const totalBit = entry.DO.reduce((s, d) => s + (d.bitnum || 0), 0);
  const totalPort = entry.DO.reduce((s, d) => s + (d.portnum || 0), 0);
  return `${entry.DO.length} 组 / bit=${totalBit} port=${totalPort}`;
}

/* ---------- XML/ESI 上传 ---------- */

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
    const result = parseDeviceXml(reader.result);
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

    // For IO entries: auto-fill DI/DO from PDO indices
    if (entry.type === "gpio") {
      if (result.pdoIndices.di.length > 0) {
        entry.DI = result.pdoIndices.di.map((idxVal) =>
          createPdoEntry({ index: idxVal, subindex: 1 })
        );
      }
      if (result.pdoIndices.do.length > 0) {
        entry.DO = result.pdoIndices.do.map((idxVal) =>
          createPdoEntry({ index: idxVal, subindex: 1 })
        );
      }
    }

    let statusParts = [`${entry.type === 'servo' ? 'Vendor' : 'Vendor'}=0x${result.vendorID?.toString(16).toUpperCase()}`];
    if (result.productcode !== null) {
      statusParts.push(`Product=0x${result.productcode.toString(16).toUpperCase()}`);
    }
    if (entry.type === "gpio" && result.pdoIndices.di.length > 0) {
      statusParts.push(`DI(${result.pdoIndices.di.length})`);
    }
    if (entry.type === "gpio" && result.pdoIndices.do.length > 0) {
      statusParts.push(`DO(${result.pdoIndices.do.length})`);
    }
    entry.xmlStatus = `已解析: ${statusParts.join(', ')}`;

    e.target.value = "";
  };
  reader.onerror = () => {
    entry.xmlStatus = "";
    errorMsg.value = "文件读取失败，请重试。";
  };
  reader.readAsText(file);
}

/* ---------- Hex 转换 ---------- */

function convertHex(idx) {
  const entry = entries.value[idx];
  if (!entry) return;
  ["vendorID", "productcode"].forEach((field) => {
    const inputField = field === "vendorID" ? "vendorIDInput" : "productcodeInput";
    const val = parseHexOrDec(entry[inputField]);
    if (val !== null) {
      entry[field] = val;
      entry[inputField] = String(val);
    } else if (!entry[inputField]) {
      entry[field] = null;
      entry[inputField] = "";
    }
  });
}

/* ---------- JSON 生成 ---------- */

function cleanPdo(arr) {
  return arr.map(({ _key, ...rest }) => ({ ...rest }));
}

const generatedJson = computed(() => {
  const servo = {};
  const gpio = {};

  for (const entry of entries.value) {
    const name = entry.name || `device_${entry.id}`;

    if (entry.type === "servo") {
      servo[name] = {
        axisNum: entry.axisNum ?? 1,
        chineseName: entry.chineseName || "",
        clearEncodeMode: entry.clearEncodeMode ?? 0,
        name,
        productcode: entry.productcode ?? 0,
        vendorID: entry.vendorID ?? 0,
      };
    } else {
      gpio[name] = {
        AD_ratio: entry.AD_ratio ?? 1000,
        AI: cleanPdo(entry.AI),
        AO: cleanPdo(entry.AO),
        DI: cleanPdo(entry.DI),
        DO: cleanPdo(entry.DO),
        chineseName: entry.chineseName || "",
        name,
        productcode: entry.productcode ?? 0,
        vendorID: entry.vendorID ?? 0,
      };
    }
  }

  return JSON.stringify({ servo, gpio, version: "1.0.0" }, null, 2);
});

function downloadJson() {
  btnLoading.value = "export";
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

watch(convMode, () => {
  convInput.value = "";
  convResult.value = "";
});
</script>

<style scoped>
.device-tool { display: grid; gap: 16px; }

.tool-layout {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 16px;
  align-items: start;
}

.tool-main { display: grid; gap: 16px; min-width: 0; }

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
.toggle-icon-sm { color: var(--muted); font-size: 14px; margin-left: auto; }

.device-list { display: grid; gap: 12px; margin-top: 12px; }

.device-card { border: 1px solid var(--line); border-radius: 8px; padding: 14px; background: #fbfcfe; }

.card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.card-header-left { display: flex; align-items: center; gap: 10px; }
.card-label { font-weight: 700; color: var(--primary); white-space: nowrap; }

.type-select {
  padding: 4px 8px;
  border: 1px solid var(--primary);
  border-radius: 5px;
  background: #eef2ff;
  color: var(--primary);
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
}
.type-select:focus { outline: none; box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2); }

.upload-row { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.file-input-hidden { display: none; }
.upload-status { color: var(--muted); font-size: 12px; }

.section-title {
  font-weight: 700;
  font-size: 14px;
  color: var(--text);
  margin: 14px 0 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--line);
  display: flex;
  align-items: center;
  gap: 8px;
}

.collapsible-section { cursor: pointer; user-select: none; }
.collapsible-section:hover { color: var(--primary); }

.section-badge {
  font-size: 11px; font-weight: 500;
  padding: 1px 8px; border-radius: 10px;
  background: #f3f4f6; color: var(--muted);
}
.section-badge.has-items { background: #eef2ff; color: var(--primary); }

.form-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }

.field { display: grid; gap: 4px; }
.field span { font-size: 13px; color: var(--muted); }
.field span em { font-style: normal; font-weight: 600; color: var(--text); }
.field input, .field select {
  padding: 7px 10px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: #fff; color: var(--text);
}
.field input:focus, .field select:focus {
  border-color: var(--primary); outline: none;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

/* PDO row */
.pdo-row {
  display: flex; align-items: flex-end; gap: 8px;
  padding: 8px 10px; margin-bottom: 6px;
  background: #f8fafc;
  border: 1px solid var(--line);
  border-radius: 6px; flex-wrap: wrap;
}

.pdo-label { font-size: 12px; font-weight: 700; color: var(--primary); min-width: 48px; padding-bottom: 7px; }

.field-inline { display: grid; gap: 2px; }
.field-inline span { font-size: 11px; color: var(--muted); }
.field-inline input {
  width: 90px; padding: 5px 8px;
  border: 1px solid var(--line); border-radius: 5px;
  background: #fff; color: var(--text); font-size: 13px;
}
.field-inline input:focus {
  border-color: var(--primary); outline: none;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
}

.add-pdo-btn { margin-top: 4px; }

.actions { display: flex; gap: 10px; margin-top: 14px; flex-wrap: wrap; }

.type-stats {
  margin-top: 10px;
  font-size: 12px;
  color: var(--muted);
  display: flex;
  align-items: center;
  gap: 8px;
}
.stats-sep { color: var(--line); }

.btn {
  padding: 7px 16px; border: 1px solid var(--line);
  border-radius: 6px; background: #fff;
  color: var(--text); cursor: pointer; font-weight: 600;
}
.btn:hover { background: #f3f4f6; }
.btn.primary { background: var(--primary); color: #fff; border-color: var(--primary); }
.btn.primary:hover { background: #1d4ed8; }

.btn-sm {
  padding: 4px 12px; border: 1px solid var(--line);
  border-radius: 5px; background: #fff;
  color: var(--text); cursor: pointer; font-size: 13px;
}
.btn-sm:hover { background: #f3f4f6; }
.btn-sm.danger { color: #dc2626; border-color: #fecaca; }
.btn-sm.danger:hover { background: #fef2f2; }
.btn-sm:disabled { opacity: 0.4; cursor: not-allowed; }

.json-preview {
  margin: 12px 0 0; padding: 14px;
  background: #f8f9fb; border: 1px solid var(--line);
  border-radius: 6px; font-size: 13px;
  overflow-x: auto; white-space: pre;
}
.json-preview code { font-family: "SF Mono", "Fira Code", monospace; }

.error-panel { border-color: #fecaca; background: #fef2f2; color: #dc2626; }
.error-panel p { margin: 0; }

/* 进制转换 */
.converter-panel h3 { margin: 0 0 12px; font-size: 16px; }

.radio-row { display: flex; gap: 6px; margin-bottom: 12px; }

.radio-item {
  flex: 1; display: flex; align-items: center; gap: 5px;
  padding: 5px 8px; border: 1px solid var(--line);
  border-radius: 6px; cursor: pointer; font-size: 13px;
  transition: border-color 0.15s, background 0.15s;
}
.radio-item:has(input:checked) { border-color: var(--primary); background: #eef2ff; }
.radio-item input { accent-color: var(--primary); margin: 0; }
.converter-panel .field { margin-bottom: 10px; }
.copy-btn { width: 100%; margin-top: 4px; }

/* 速查表 */
.quick-ref h3 { margin: 0 0 12px; font-size: 16px; }

.ref-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.ref-table th, .ref-table td { padding: 5px 8px; border-bottom: 1px solid var(--line); text-align: left; }
.ref-table th { color: var(--muted); font-weight: 600; }
.ref-table code { font-family: "SF Mono", "Fira Code", monospace; font-size: 12px; color: var(--primary); }

/* 参数说明 */
.param-ref { margin-top: 0; }
.param-ref-toggle {
  margin: 0; font-size: 16px; cursor: pointer;
  user-select: none; display: flex; align-items: center; justify-content: space-between;
}

.param-list { margin: 12px 0 0; display: grid; gap: 10px; }
.param-list dt { font-weight: 700; font-size: 12px; color: var(--primary); margin-bottom: 2px; font-family: "SF Mono", "Fira Code", monospace; }
.param-list .param-section { color: var(--text); font-size: 13px; margin-top: 4px; padding-top: 6px; border-top: 1px solid var(--line); }
.param-list dd { margin: 0; font-size: 12px; color: var(--muted); line-height: 1.6; }

/* 响应式 */
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
  .device-card { padding: 12px; }
  .card-header { flex-wrap: wrap; gap: 8px; }
  .pdo-row { flex-direction: column; align-items: stretch; }
  .field-inline input { width: 100%; }
}

@media (max-width: 900px) {
  .tool-layout { grid-template-columns: 1fr; }
  .tool-sidebar { position: static; }
}
</style>

<style>
.device-toast {
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

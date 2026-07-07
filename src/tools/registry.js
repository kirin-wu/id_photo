import A4ImageTool from "./a4-image/A4ImageTool.vue";
import BaseConverterTool from "./base-converter/BaseConverterTool.vue";
import DeviceIdentifyTool from "./device-identify/DeviceIdentifyTool.vue";
import EniHelperTool from "./eni-helper/EniHelperTool.vue";
import GearRatioTool from "./gear-ratio/GearRatioTool.vue";
import IdPhotoTool from "./id-photo/IdPhotoTool.vue";

export const toolCategories = [];

export const tools = [
  {
    id: "id-photo",
    title: "证件照",
    navLabel: "证件照",
    description: "拍照、裁切、换底色，支持一寸/二寸，导出证件照。",
    category: "image",
    icon: "camera",
    path: "/tools/id-photo",
    component: IdPhotoTool,
  },
  {
    id: "device-identify",
    title: "设备识别",
    navLabel: "设备识别",
    description: "上传 XML / ESI 文件或手动填写，生成伺服与 IO 板 slaveTypeLib JSON。",
    category: "device",
    icon: "cpu",
    path: "/tools/device-identify",
    aliases: ["/device-identify"],
    component: DeviceIdentifyTool,
  },
  {
    id: "a4-image",
    title: "A4 合图",
    navLabel: "A4 合图",
    description: "两张图片自动排到 A4 页面，支持打印和 PNG 导出。",
    category: "print",
    icon: "images",
    path: "/tools/a4-image",
    aliases: ["/a4-image"],
    component: A4ImageTool,
  },
  {
    id: "eni-helper",
    title: "ENI 查询下载助手",
    navLabel: "ENI 查询下载助手",
    description: "内嵌 ENI 查询下载服务，保留外部打开入口。",
    category: "download",
    icon: "search",
    path: "/tools/eni-helper",
    aliases: ["/eni-helper"],
    component: EniHelperTool,
  },
  {
    id: "gear-ratio",
    title: "减速比计算",
    navLabel: "减速比计算",
    description: "按原始减速比、显示角度和实测角度计算机器人关节实际减速比。",
    category: "robot",
    icon: "calculator",
    path: "/tools/gear-ratio",
    aliases: ["/gear-ratio"],
    component: GearRatioTool,
  },
  {
    id: "base-converter",
    title: "进制转化",
    navLabel: "进制转化",
    description: "输入二进制、十进制或十六进制，快速得到常见进制结果。",
    category: "number",
    icon: "binary",
    path: "/tools/base-converter",
    aliases: ["/base-converter"],
    component: BaseConverterTool,
  },
];

export function normalizePath(pathname) {
  return pathname.replace(/\/+$/, "") || "/";
}

export function findToolByPath(pathname) {
  const normalizedPath = normalizePath(pathname);
  return tools.find((tool) => {
    const aliases = tool.aliases ?? [];
    return tool.path === normalizedPath || aliases.includes(normalizedPath);
  });
}

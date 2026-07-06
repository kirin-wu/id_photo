import A4ImageTool from "./a4-image/A4ImageTool.vue";
import DeviceIdentifyTool from "./device-identify/DeviceIdentifyTool.vue";
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

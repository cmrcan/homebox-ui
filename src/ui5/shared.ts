import type Control from "sap/ui/core/Control";
import type Dialog from "sap/m/Dialog";
import type JSONModel from "sap/ui/model/json/JSONModel";
import { U } from "./runtime";
import { s, guarded } from "../store";
export let appModel: JSONModel;
export function setAppModel(model: JSONModel) {
  appModel = model;
}
export const text = (value: string) =>
  new U.Text({ text: value, wrapping: true });
export const title = (value: string, level: "H1" | "H2" | "H3" = "H2") =>
  new U.Title({
    text: value,
    level,
    titleStyle: level === "H1" ? "H2" : "H3",
    wrapping: true,
  });
export const button = (
  label: string,
  press: () => unknown,
  icon?: string,
  primary = false,
) =>
  new U.Button({
    text: label,
    press: () => {
      void press();
    },
    icon: icon ? `sap-icon://${icon}` : undefined,
    type: primary ? "Emphasized" : "Default",
    enabled: {
      parts: ["/saving", "/busy"],
      formatter: (saving: boolean, busy: boolean) => !saving && !busy,
    },
  });
export const stack = (...items: Control[]) =>
  new U.VBox({ width: "100%", items }).addStyleClass("hb-stack");
export const row = (...items: Control[]) =>
  new U.FlexBox({
    renderType: "Bare",
    wrap: "Wrap",
    alignItems: "Center",
    items,
  }).addStyleClass("hb-row");
export const panel = (heading: string, ...content: Control[]) =>
  new U.Panel({
    headerText: heading,
    content: [stack(...content)],
  }).addStyleClass("hb-panel");
export const errorStrip = () =>
  new U.MessageStrip({
    text: "{/error}",
    type: "Error",
    showIcon: true,
    visible: { path: "/error", formatter: Boolean },
  });
export function field(label: string, control: Control) {
  return stack(
    new U.Label({ text: label, labelFor: control, required: false }),
    control,
  ).addStyleClass("hb-field");
}
export function input<T extends object>(
  label: string,
  obj: T,
  key: keyof T,
  options: {
    type?: "Text" | "Email" | "Password" | "Number";
    required?: boolean;
    change?: () => void;
  } = {},
) {
  const value = obj[key];
  const control = new U.Input({
    width: "100%",
    value: String(value ?? ""),
    type: options.type || "Text",
    required: options.required,
    liveChange: (e) => {
      (obj as Record<string, unknown>)[String(key)] =
        options.type === "Number"
          ? Number(e.getParameter("value"))
          : e.getParameter("value") || "";
      options.change?.();
    },
  });
  return field(label, control);
}
export function area<T extends object>(label: string, obj: T, key: keyof T) {
  return field(
    label,
    new U.TextArea({
      width: "100%",
      rows: 3,
      value: String(obj[key] ?? ""),
      liveChange: (e) => {
        (obj as Record<string, unknown>)[String(key)] =
          e.getParameter("value") || "";
      },
    }),
  );
}
export function dateInput<T extends object>(
  label: string,
  obj: T,
  key: keyof T,
) {
  return field(
    label,
    new U.DatePicker({
      width: "100%",
      value: String(obj[key] ?? ""),
      valueFormat: "yyyy-MM-dd",
      displayFormat: "medium",
      change: (e) => {
        (obj as Record<string, unknown>)[String(key)] =
          e.getParameter("value") || "";
      },
    }),
  );
}
export function select(
  label: string,
  values: { id: string; name: string }[],
  selectedKey: string,
  change: (key: string) => void,
) {
  const control = new U.Select({
    width: "100%",
    selectedKey,
    items: values.map((x) => new U.Item({ key: x.id, text: x.name })),
    change: (e) => change(e.getParameter("selectedItem")?.getKey() || ""),
  });
  return field(label, control);
}
export function checkbox(
  label: string,
  value: boolean,
  change: (v: boolean) => void,
) {
  return new U.CheckBox({
    text: label,
    selected: value,
    select: (e) => change(!!e.getParameter("selected")),
  });
}
export function dialog(
  heading: string,
  content: Control[],
  actions: InstanceType<typeof U.Button>[] = [],
  onClose?: () => void,
): Dialog {
  const d: Dialog = new U.Dialog({
    title: heading,
    contentWidth: "48rem",
    draggable: false,
    resizable: false,
    horizontalScrolling: false,
    content: [
      stack(errorStrip(), ...content).addStyleClass(
        "sapUiResponsiveContentPadding",
      ),
    ],
    buttons: [...actions, button("Pencereyi kapat", () => d.close())],
    afterClose: () => {
      onClose?.();
      d.destroy();
    },
  });
  d.setModel(appModel);
  d.open();
  return d;
}
export function confirm(message: string, task: () => Promise<void>) {
  U.MessageBox.confirm(message, {
    actions: ["Evet, sil", "Vazgeç"],
    emphasizedAction: "Vazgeç",
    onClose: (action) => {
      if (action === "Evet, sil") void guarded(task);
    },
  });
}
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function requireName(name: string) {
  if (!name.trim()) {
    s.error = "Lütfen bir ad girin.";
    return false;
  }
  return true;
}

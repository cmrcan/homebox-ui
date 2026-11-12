export interface UI5 {
  Core: typeof import("sap/ui/core/Core").default;
  OverflowToolbarButton: typeof import("sap/m/OverflowToolbarButton").default;
  Button: typeof import("sap/m/Button").default;
  VBox: typeof import("sap/m/VBox").default;
  HBox: typeof import("sap/m/HBox").default;
  FlexBox: typeof import("sap/m/FlexBox").default;
  Title: typeof import("sap/m/Title").default;
  Text: typeof import("sap/m/Text").default;
  Label: typeof import("sap/m/Label").default;
  Input: typeof import("sap/m/Input").default;
  TextArea: typeof import("sap/m/TextArea").default;
  Select: typeof import("sap/m/Select").default;
  MultiComboBox: typeof import("sap/m/MultiComboBox").default;
  CheckBox: typeof import("sap/m/CheckBox").default;
  DatePicker: typeof import("sap/m/DatePicker").default;
  SearchField: typeof import("sap/m/SearchField").default;
  Dialog: typeof import("sap/m/Dialog").default;
  MessageStrip: typeof import("sap/m/MessageStrip").default;
  MessageBox: typeof import("sap/m/MessageBox").default;
  MessageToast: typeof import("sap/m/MessageToast").default;
  OverflowToolbar: typeof import("sap/m/OverflowToolbar").default;
  ToolbarSpacer: typeof import("sap/m/ToolbarSpacer").default;
  Panel: typeof import("sap/m/Panel").default;
  List: typeof import("sap/m/List").default;
  CustomListItem: typeof import("sap/m/CustomListItem").default;
  StandardListItem: typeof import("sap/m/StandardListItem").default;
  Table: typeof import("sap/m/Table").default;
  Column: typeof import("sap/m/Column").default;
  ColumnListItem: typeof import("sap/m/ColumnListItem").default;
  ObjectStatus: typeof import("sap/m/ObjectStatus").default;
  ObjectNumber: typeof import("sap/m/ObjectNumber").default;
  Link: typeof import("sap/m/Link").default;
  Image: typeof import("sap/m/Image").default;
  IconTabBar: typeof import("sap/m/IconTabBar").default;
  IconTabFilter: typeof import("sap/m/IconTabFilter").default;
  ShellBar: typeof import("sap/f/ShellBar").default;
  GridContainer: typeof import("sap/f/GridContainer").default;
  GridContainerSettings: typeof import("sap/f/GridContainerSettings").default;
  Item: typeof import("sap/ui/core/Item").default;
  Icon: typeof import("sap/ui/core/Icon").default;
  JSONModel: typeof import("sap/ui/model/json/JSONModel").default;
  SimpleForm: typeof import("sap/ui/layout/form/SimpleForm").default;
  FileUploader: typeof import("sap/ui/unified/FileUploader").default;
  Theming: typeof import("sap/ui/core/Theming").default;
}
export let U: UI5;
export async function loadUI5(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    sap.ui.require(
      [
        "sap/ui/core/Core",
        "sap/m/OverflowToolbarButton",
        "sap/m/Button",
        "sap/m/VBox",
        "sap/m/HBox",
        "sap/m/FlexBox",
        "sap/m/Title",
        "sap/m/Text",
        "sap/m/Label",
        "sap/m/Input",
        "sap/m/TextArea",
        "sap/m/Select",
        "sap/m/MultiComboBox",
        "sap/m/CheckBox",
        "sap/m/DatePicker",
        "sap/m/SearchField",
        "sap/m/Dialog",
        "sap/m/MessageStrip",
        "sap/m/MessageBox",
        "sap/m/MessageToast",
        "sap/m/OverflowToolbar",
        "sap/m/ToolbarSpacer",
        "sap/m/Panel",
        "sap/m/List",
        "sap/m/CustomListItem",
        "sap/m/StandardListItem",
        "sap/m/Table",
        "sap/m/Column",
        "sap/m/ColumnListItem",
        "sap/m/ObjectStatus",
        "sap/m/ObjectNumber",
        "sap/m/Link",
        "sap/m/Image",
        "sap/m/IconTabBar",
        "sap/m/IconTabFilter",
        "sap/f/ShellBar",
        "sap/f/GridContainer",
        "sap/f/GridContainerSettings",
        "sap/ui/core/Item",
        "sap/ui/core/Icon",
        "sap/ui/model/json/JSONModel",
        "sap/ui/layout/form/SimpleForm",
        "sap/ui/unified/FileUploader",
        "sap/ui/core/Theming",
      ],
      (...modules: unknown[]) => {
        U = Object.fromEntries(
          [
            "Core",
            "OverflowToolbarButton",
            "Button",
            "VBox",
            "HBox",
            "FlexBox",
            "Title",
            "Text",
            "Label",
            "Input",
            "TextArea",
            "Select",
            "MultiComboBox",
            "CheckBox",
            "DatePicker",
            "SearchField",
            "Dialog",
            "MessageStrip",
            "MessageBox",
            "MessageToast",
            "OverflowToolbar",
            "ToolbarSpacer",
            "Panel",
            "List",
            "CustomListItem",
            "StandardListItem",
            "Table",
            "Column",
            "ColumnListItem",
            "ObjectStatus",
            "ObjectNumber",
            "Link",
            "Image",
            "IconTabBar",
            "IconTabFilter",
            "ShellBar",
            "GridContainer",
            "GridContainerSettings",
            "Item",
            "Icon",
            "JSONModel",
            "SimpleForm",
            "FileUploader",
            "Theming",
          ].map((key, i) => [key, modules[i]]),
        ) as unknown as UI5;
        U.Core.ready().then(() => resolve(), reject);
      },
      reject,
    );
  });
}

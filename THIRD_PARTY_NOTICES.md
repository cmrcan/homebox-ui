# Third-party notices

The interface uses the native **OpenUI5 1.154.0** framework by SAP SE under the
Apache License 2.0. The full license is included at `public/licenses/openui5.txt`
and is shipped at `/licenses/openui5.txt` and `/resources/THIRD-PARTY-LICENSES.txt`.
UI5 Tooling builds the `sap.ui.core`, `sap.m`, `sap.f`, `sap.ui.layout`,
`sap.ui.unified` and Horizon theme libraries into the Docker image. No SAPUI5
commercial-only libraries or external CDN resources are used.

`@vue/reactivity` (MIT) is used only for the existing application state. The UI
is rendered entirely by OpenUI5 controls; Vue templates, Preline and Tailwind
are no longer part of the application. The MIT license for Vue reactivity is
shipped at `/licenses/vue-reactivity.txt`.

Other dependencies retain their respective package license notices.

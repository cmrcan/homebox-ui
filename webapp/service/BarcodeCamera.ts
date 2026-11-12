import type { IScannerControls } from "@zxing/browser";
type Decoder = Pick<
  typeof import("@zxing/browser"),
  "BrowserMultiFormatReader"
>;
let decoder: Promise<Decoder> | undefined;
function loadDecoder(): Promise<Decoder> {
  decoder ??= new Promise<Decoder>((resolve, reject) => {
    sap.ui.require(["homebox/thirdparty/zxing"], resolve, reject);
  }).catch((error) => {
    decoder = undefined;
    throw error;
  });
  return decoder;
}
export function cameraError(error: unknown): string {
  const name =
    error instanceof Error || error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError")
    return "Kamera izni verilmedi. Tarayıcıdan kamera iznini açabilir veya kodu elle girebilirsin.";
  if (name === "NotFoundError" || name === "OverconstrainedError")
    return "Kullanılabilir kamera bulunamadı. Kodu elle girebilirsin.";
  if (name === "NotReadableError")
    return "Kamera başka bir uygulama tarafından kullanılıyor. Kapatıp tekrar dene veya kodu elle gir.";
  return error instanceof Error
    ? error.message
    : "Kamera başlatılamadı. Kodu elle girebilirsin.";
}
/** Camera lifetime is independent of dialogs: every close/cancel stops all tracks, including delayed permission grants. */
export default class BarcodeCamera {
  private generation = 0;
  private stream?: MediaStream;
  private controls?: IScannerControls;
  private preview?: HTMLVideoElement;
  private resize?: ResizeObserver;
  private metadata?: () => void;
  public async start(
    video: HTMLVideoElement,
    onResult: (text: string) => void,
  ): Promise<void> {
    this.stop();
    const generation = this.generation;
    if (!window.isSecureContext)
      throw new Error(
        "Kamera için HTTPS bağlantısı gerekir. Kodu elle girebilirsin.",
      );
    if (!navigator.mediaDevices?.getUserMedia)
      throw new Error(
        "Bu tarayıcıda kamera erişimi desteklenmiyor. Kodu elle girebilirsin.",
      );
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });
    if (generation !== this.generation) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    this.stream = stream;
    this.preview = video;
    video.muted = true;
    video.playsInline = true;
    this.metadata = () => {
      const width = Math.max(
        1,
        Math.min(640, video.parentElement?.clientWidth || 256),
      );
      video.width = width;
      video.height = Math.round(
        width *
          (video.videoHeight && video.videoWidth
            ? video.videoHeight / video.videoWidth
            : 0.75),
      );
    };
    this.metadata();
    video.addEventListener("loadedmetadata", this.metadata);
    this.resize = new ResizeObserver(this.metadata);
    if (video.parentElement) this.resize.observe(video.parentElement);
    try {
      const library = await loadDecoder();
      if (generation !== this.generation) return;
      const reader = new library.BrowserMultiFormatReader(undefined, {
        delayBetweenScanAttempts: 150,
        delayBetweenScanSuccess: 500,
      });
      const controls = await reader.decodeFromStream(
        stream,
        video,
        (result) => {
          if (!result || generation !== this.generation) return;
          const text = result.getText().trim();
          if (!text) return;
          this.stop();
          onResult(text);
        },
      );
      if (generation !== this.generation) controls.stop();
      else this.controls = controls;
    } catch (error) {
      if (generation !== this.generation) return;
      this.stop();
      throw error;
    }
  }
  public stop(): void {
    this.generation++;
    this.resize?.disconnect();
    this.resize = undefined;
    const controls = this.controls;
    this.controls = undefined;
    try {
      controls?.stop();
    } finally {
      this.stream?.getTracks().forEach((track) => track.stop());
      this.stream = undefined;
      if (this.preview) {
        if (this.metadata)
          this.preview.removeEventListener("loadedmetadata", this.metadata);
        this.preview.pause();
        this.preview.srcObject = null;
      }
      this.preview = undefined;
      this.metadata = undefined;
    }
  }
}

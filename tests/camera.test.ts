import { afterEach, describe, expect, it, vi } from "vitest";
import BarcodeCamera, { cameraError } from "../webapp/service/BarcodeCamera";
afterEach(() => vi.unstubAllGlobals());
describe("camera lifecycle", () => {
  it("releases permission granted after the dialog has already closed", async () => {
    let grant!: (value: MediaStream) => void;
    vi.stubGlobal("window", { isSecureContext: true });
    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: () =>
          new Promise<MediaStream>((resolve) => {
            grant = resolve;
          }),
      },
    });
    const stop = vi.fn();
    const camera = new BarcodeCamera();
    const starting = camera.start({} as HTMLVideoElement, vi.fn());
    camera.stop();
    grant({ getTracks: () => [{ stop }] } as unknown as MediaStream);
    await starting;
    expect(stop).toHaveBeenCalledOnce();
  });
  it("stops tracks while the decoder is still loading and never starts a cancelled decoder", async () => {
    let ready!: (value: unknown) => void;
    const constructor = vi.fn();
    const stop = vi.fn();
    vi.stubGlobal("window", { isSecureContext: true });
    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: async () => ({ getTracks: () => [{ stop }] }),
      },
    });
    vi.stubGlobal("sap", {
      ui: {
        require: (_names: unknown, resolve: (x: unknown) => void) => {
          ready = resolve;
        },
      },
    });
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        disconnect() {}
      },
    );
    const video = {
      parentElement: { clientWidth: 256 },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      pause: vi.fn(),
      srcObject: null,
    } as unknown as HTMLVideoElement;
    const camera = new BarcodeCamera();
    const starting = camera.start(video, vi.fn());
    await vi.waitFor(() => expect(ready).toBeTypeOf("function"));
    camera.stop();
    expect(stop).toHaveBeenCalledOnce();
    ready({ BrowserMultiFormatReader: constructor });
    await starting;
    expect(constructor).not.toHaveBeenCalled();
    expect(video.srcObject).toBeNull();
  });
  it("offers an actionable manual fallback for permissions and insecure origins", async () => {
    vi.stubGlobal("window", { isSecureContext: false });
    await expect(
      new BarcodeCamera().start({} as HTMLVideoElement, vi.fn()),
    ).rejects.toThrow("HTTPS");
    expect(
      cameraError(new DOMException("Denied", "NotAllowedError")),
    ).toContain("Kamera izni verilmedi");
  });
});

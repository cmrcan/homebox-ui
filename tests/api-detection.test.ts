import { describe, expect, it, vi } from "vitest";
import { ApiError, HomeboxApi } from "../src/api";

describe("automatic server compatibility", () => {
  it("uses entities when the server exposes entity types, replacing a stale cached preference", async () => {
    const transport = vi.fn(async () => new Response("[]"));
    const api = new HomeboxApi("legacy", transport);
    expect(await api.detectMode()).toBe("entities");
    expect(api.resource).toBe("/entities");
    expect(transport.mock.calls).toHaveLength(1);
  });
  it("only selects legacy after its inventory endpoint succeeds", async () => {
    const transport = vi.fn(async (input: RequestInfo | URL) =>
      String(input).endsWith("/entity-types")
        ? new Response("{}", { status: 404 })
        : new Response('{"items":[],"total":0}'),
    );
    const api = new HomeboxApi("entities", transport);
    expect(await api.detectMode()).toBe("legacy");
    expect(api.resource).toBe("/items");
    expect(transport.mock.calls.map(([url]) => url)).toEqual([
      "/api/v1/entity-types",
      "/api/v1/items?page=1&pageSize=1",
    ]);
  });
  it("does not interpret authentication or server errors as a legacy installation", async () => {
    for (const status of [401, 403, 500]) {
      const transport = vi.fn(async () => new Response("{}", { status }));
      await expect(
        new HomeboxApi("entities", transport).detectMode(),
      ).rejects.toBeInstanceOf(ApiError);
      expect(transport).toHaveBeenCalledTimes(1);
    }
  });
  it("does not silently select legacy if both endpoint families fail", async () => {
    const transport = vi.fn(async () => new Response("{}", { status: 404 }));
    const api = new HomeboxApi("entities", transport);
    await expect(api.detectMode()).rejects.toBeInstanceOf(ApiError);
    expect(api.mode).toBe("entities");
  });
});

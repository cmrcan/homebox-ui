import { describe, it, expect, vi } from "vitest";
import { HomeboxApi } from "../src/api";

function setup(handler?: (url: string) => Response) {
  const transport = vi.fn(
    async (input: RequestInfo | URL) =>
      handler?.(String(input)) ??
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
  );
  const api = new HomeboxApi("entities", transport);
  api.session = { token: "Bearer t", attachmentToken: "att", expiresAt: "2099" };
  api.tenant = "group";
  const call = (i: number) =>
    transport.mock.calls[i] as unknown as [string, RequestInit];
  return { api, transport, call };
}

describe("entity types, templates and users", () => {
  it("creates with POST and updates with a full PUT that keeps unedited props", async () => {
    const { api, call } = setup();
    await api.typeSave({ name: "Yeni", isLocation: false });
    await api.typeSave(
      { name: "Ad" },
      { id: "t1", name: "Eski", isLocation: false, icon: "box" },
    );
    expect(call(0)[0]).toBe("/api/v1/entity-types");
    expect(call(0)[1].method).toBe("POST");
    expect(call(1)[0]).toBe("/api/v1/entity-types/t1");
    expect(JSON.parse(String(call(1)[1].body))).toEqual({
      id: "t1",
      name: "Ad",
      isLocation: false,
      icon: "box",
    });
  });
  it("sends template fields and the group header", async () => {
    const { api, call } = setup();
    await api.templateSave({
      name: "Ağ cihazı",
      fields: [{ name: "IP", type: "text", textValue: "" }],
    });
    expect(call(0)[1].method).toBe("POST");
    expect(new Headers(call(0)[1].headers).get("X-Tenant")).toBe("group");
    expect(JSON.parse(String(call(0)[1].body)).fields).toHaveLength(1);
  });
  it("uses the documented change-password and invitation payloads", async () => {
    const { api, call } = setup();
    await api.changePassword("old", "new");
    await api.invite(3, "2030-01-01T00:00:00Z");
    expect(JSON.parse(String(call(0)[1].body))).toEqual({ current: "old", new: "new" });
    expect(call(1)[0]).toBe("/api/v1/groups/invitations");
    expect(JSON.parse(String(call(1)[1].body))).toEqual({
      uses: 3,
      expiresAt: "2030-01-01T00:00:00Z",
    });
  });
});

describe("maintenance, tools and export", () => {
  it("scopes maintenance to the current resource", async () => {
    const { api, call } = setup();
    await api.itemMaintenance("i1");
    await api.addMaintenance("i1", { name: "Filtre" });
    expect(call(0)[0]).toBe("/api/v1/entities/i1/maintenance");
    expect(call(1)[1].method).toBe("POST");
  });
  it("encodes the notifier test URL as a query parameter", async () => {
    const { api, call } = setup();
    await api.testNotifier("ntfy://a/b?c=d");
    expect(call(0)[0]).toBe("/api/v1/notifiers/test?url=ntfy%3A%2F%2Fa%2Fb%3Fc%3Dd");
  });
  it("falls back to the legacy export path after a 404", async () => {
    const { api, transport } = setup((url) =>
      url.startsWith("/api/v1/entities/export")
        ? new Response("{}", { status: 404 })
        : new Response("a,b"),
    );
    const blob = await api.exportCsv();
    expect(await blob.text()).toBe("a,b");
    expect(transport).toHaveBeenCalledTimes(2);
  });
  it("keeps the session token out of label URLs", () => {
    const { api } = setup();
    const url = api.labelUrl("i1");
    expect(url).toContain("access_token=att");
    expect(url).not.toContain("Bearer");
  });
});

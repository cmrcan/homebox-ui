import { describe, expect, it } from "vitest";
import { ancestorCrumbs } from "../webapp/model/breadcrumbs";
import type { Organizer } from "../webapp/service/HomeboxApi";
describe("object breadcrumbs", () => {
  it("resolves parentId-only ancestors from root to leaf", () => {
    const house = { id: "house", name: "Ev" };
    const room = { id: "room", name: "Salon", parentId: "house" };
    expect(
      ancestorCrumbs({ id: "i", name: "Ürün", parent: room }, [house, room]),
    ).toEqual([
      { text: "Ev", id: "house", route: "location" },
      { text: "Salon", id: "room", route: "location" },
    ]);
  });
  it("keeps product parents on product routes", () => {
    expect(
      ancestorCrumbs(
        { id: "i", name: "Parça", parent: { id: "p", name: "Cihaz" } },
        [],
      ),
    ).toEqual([{ text: "Cihaz", id: "p", route: "item" }]);
  });
  it("terminates cyclic and self-referencing locations", () => {
    const a: Organizer = { id: "a", name: "A", parentId: "b" };
    const b: Organizer = { id: "b", name: "B", parentId: "a" };
    expect(ancestorCrumbs(a, [a, b])).toEqual([
      { text: "B", id: "b", route: "location" },
    ]);
    expect(ancestorCrumbs({ ...a, parentId: "a" }, [a])).toEqual([]);
  });
  it("tolerates missing ancestors and unlisted location parents", () => {
    expect(
      ancestorCrumbs({ id: "i", name: "Ürün", parentId: "removed" }, []),
    ).toEqual([]);
    expect(
      ancestorCrumbs(
        {
          id: "i",
          name: "Ürün",
          parent: {
            id: "r",
            name: "Oda",
            entityType: { id: "rt", name: "Oda", isLocation: true },
          },
        },
        [],
      ),
    ).toEqual([{ text: "Oda", id: "r", route: "location" }]);
  });
});

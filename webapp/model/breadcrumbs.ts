import type { Organizer } from "../service/HomeboxApi";
export interface Crumb {
  text: string;
  route: string;
  id?: string;
}
/** Resolve known parents defensively: incomplete data and cycles must stay navigable. */
export function ancestorCrumbs(
  object: Organizer,
  locations: Organizer[],
): Crumb[] {
  const result: Crumb[] = [];
  const visited = new Set([object.id]);
  let parent = object.parent || locations.find((x) => x.id === object.parentId);
  while (parent && !visited.has(parent.id)) {
    visited.add(parent.id);
    const known = locations.find((x) => x.id === parent!.id);
    result.unshift({
      text: parent.name,
      route: known || parent.entityType?.isLocation ? "location" : "item",
      id: parent.id,
    });
    parent =
      known?.parent ||
      parent.parent ||
      locations.find((x) => x.id === (known?.parentId || parent?.parentId));
  }
  return result;
}

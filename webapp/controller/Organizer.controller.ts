import BaseController, { type UIEvent } from "./BaseController";
import { ancestorCrumbs, type Crumb } from "../model/breadcrumbs";
/** @namespace homebox.controller */
export default class OrganizerController extends BaseController {
  private loadedKey = "";
  private generation = 0;
  public override onInit(): void {
    super.onInit();
    this.setViewModel({
      pageTitle: "Konum",
      ready: false,
      loading: false,
      editing: false,
      crumbs: [],
    });
    this.route(["location", "locationNew", "tag", "tagNew"]);
  }
  protected override async onPageEntered(entered = false): Promise<void> {
    const state = this.app.state();
    const tenant = state.tenant;
    const kind = state.routeName.startsWith("location") ? "locations" : "tags";
    const id = state.routeName.endsWith("New") ? "" : this.routeArguments.id;
    const key = `${state.tenant}:${kind}:${id || "new"}`;
    if (
      !entered &&
      key === this.loadedKey &&
      (state.saving || this.vm().getProperty("/editing"))
    )
      return;
    const generation = ++this.generation;
    this.loadedKey = key;
    this.vm().setData({
      pageTitle: id
        ? "Yükleniyor…"
        : kind === "locations"
          ? "Konum ekle"
          : "Etiket ekle",
      ready: false,
      loading: !!id,
      editing: !id,
      crumbs: [],
    });
    this.app.prepareOrganizer(kind);
    if (id) {
      const organizer = await this.app.run(() =>
        this.app.api.organizer(kind, id),
      );
      if (
        generation !== this.generation ||
        tenant !== this.app.state().tenant ||
        !["location", "tag"].includes(this.app.state().routeName)
      )
        return;
      this.vm().setProperty("/loading", false);
      if (!organizer) {
        this.vm().setProperty("/pageTitle", "Kayıt yüklenemedi");
        this.setCrumbs();
        this.resetObjectPage();
        this.loadedKey = "";
        return;
      }
      this.app.prepareOrganizer(kind, organizer);
      this.vm().setProperty("/pageTitle", organizer.name);
    }
    this.vm().setProperty("/ready", true);
    this.setCrumbs();
    this.resetObjectPage();
  }
  private setCrumbs(): void {
    const state = this.app.state();
    this.vm().setProperty("/crumbs", [
      { text: "Homebox", route: "overview" },
      {
        text: state.organizerKind === "locations" ? "Konumlar" : "Etiketler",
        route: state.organizerKind,
      },
      ...(state.organizer && state.organizerKind === "locations"
        ? ancestorCrumbs(state.organizer, state.locations)
        : []),
    ]);
  }
  public onCrumb(event: UIEvent): void {
    const crumb = this.context<Crumb>(event, "view");
    this.getRouter().navTo(crumb.route, crumb.id ? { id: crumb.id } : {});
  }
  public onParent(): void {
    const parent = this.app.state().organizer?.parent;
    if (parent)
      this.getRouter().navTo(
        this.app.state().organizerKind === "locations" ? "location" : "tag",
        { id: parent.id },
      );
  }
  public onBack(): void {
    this.getRouter().navTo(this.app.state().organizerKind);
  }
  public onEdit(): void {
    this.vm().setProperty("/editing", true);
    this.resetObjectPage();
  }
  public onCancelEdit(): void {
    const state = this.app.state();
    if (!state.organizer) {
      this.onBack();
      return;
    }
    this.app.prepareOrganizer(state.organizerKind, state.organizer);
    this.vm().setProperty("/editing", false);
    this.resetObjectPage();
  }
  public async onSave(): Promise<void> {
    const saved = await this.app.saveOrganizer();
    if (!saved) {
      this.resetObjectPage();
      return;
    }
    this.vm().setProperty("/pageTitle", saved.name);
    this.vm().setProperty("/editing", false);
    this.setCrumbs();
    this.resetObjectPage();
    if (this.app.state().routeName.endsWith("New"))
      this.getRouter().navTo(
        this.app.state().organizerKind === "locations" ? "location" : "tag",
        { id: saved.id },
        true,
      );
  }
  public onViewItems(): void {
    const state = this.app.state(),
      organizer = state.organizer;
    if (!organizer) return;
    this.app.update({
      search: "",
      page: 1,
      locationFilter: state.organizerKind === "locations" ? organizer.id : "",
      tagFilter: state.organizerKind === "tags" ? organizer.id : "",
    });
    this.getRouter().navTo("inventory");
    void this.app.loadItems();
  }
}

<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { Copy, LoaderCircle, Trash2, UserPlus } from "lucide-vue-next";
import type { Invitation, Member } from "../api";
import {
  api,
  currentGroup,
  flash,
  guarded,
  handleError,
  logout,
  s,
} from "../store";

const profile = reactive({ name: "", email: "" });
const password = reactive({ current: "", next: "", again: "" });
const group = reactive({ name: "", currency: "TRY" });
const invite = reactive({ uses: 1, days: 7 });
const invitation = ref<Invitation | null>(null);
const members = ref<Member[]>([]);
const membersNote = ref("");
const confirmMember = ref("");
const deleteText = ref("");

onMounted(async () => {
  profile.name = s.user?.name || "";
  profile.email = s.user?.email || "";
  group.name = currentGroup()?.name || "";
  group.currency = currentGroup()?.currency || "TRY";
  try {
    members.value = (await api.members()) || [];
  } catch {
    membersNote.value = "Bu Homebox sürümü üye listesini sunmuyor olabilir.";
  }
});

const saveProfile = () =>
  guarded(async () => {
    s.user = await api.updateSelf({
      name: profile.name.trim(),
      email: profile.email.trim(),
    });
    flash("Profil güncellendi.");
  });
const changePassword = () =>
  guarded(async () => {
    if (password.next !== password.again)
      throw new Error("Yeni şifreler eşleşmiyor.");
    await api.changePassword(password.current, password.next);
    Object.assign(password, { current: "", next: "", again: "" });
    flash("Şifre değiştirildi.");
  });
const saveGroup = () =>
  guarded(async () => {
    const saved = await api.updateGroup({
      name: group.name.trim(),
      currency: group.currency,
    });
    const index = s.groups.findIndex((g) => g.id === s.tenant);
    if (index >= 0) s.groups[index] = { ...s.groups[index], ...saved };
    s.currency = group.currency;
    flash("Koleksiyon güncellendi.");
  });
const createInvite = () =>
  guarded(async () => {
    const expires = new Date(Date.now() + invite.days * 86400000).toISOString();
    invitation.value = await api.invite(invite.uses, expires);
  });
async function copyToken() {
  if (!invitation.value) return;
  try {
    await navigator.clipboard.writeText(invitation.value.token);
    flash("Davet kodu kopyalandı.");
  } catch (e) {
    handleError(e);
  }
}
const removeMember = (id: string) =>
  guarded(async () => {
    await api.removeMember(id);
    members.value = members.value.filter((m) => m.id !== id);
    confirmMember.value = "";
    flash("Üye koleksiyondan çıkarıldı.");
  });
const deleteAccount = () =>
  guarded(async () => {
    await api.deleteSelf();
    await logout();
  });
</script>

<template>
  <div v-if="s.error" role="alert" class="alert-error mb-4">{{ s.error }}</div>

  <div class="grid gap-4 lg:grid-cols-2">
    <form class="card card-body space-y-4" @submit.prevent="saveProfile">
      <h2 class="text-lg font-semibold">Profil</h2>
      <label class="field">Ad<input v-model="profile.name" required /></label>
      <label class="field"
        >E-posta<input v-model="profile.email" type="email" required
      /></label>
      <button class="btn-primary" :disabled="s.saving">
        <LoaderCircle v-if="s.saving" class="animate-spin" :size="16" />Profili
        kaydet
      </button>
    </form>

    <form class="card card-body space-y-4" @submit.prevent="changePassword">
      <h2 class="text-lg font-semibold">Şifre değiştir</h2>
      <label class="field"
        >Mevcut şifre<input
          v-model="password.current"
          type="password"
          required
          autocomplete="current-password"
      /></label>
      <label class="field"
        >Yeni şifre<input
          v-model="password.next"
          type="password"
          required
          minlength="8"
          autocomplete="new-password"
      /></label>
      <label class="field"
        >Yeni şifre (tekrar)<input
          v-model="password.again"
          type="password"
          required
          minlength="8"
          autocomplete="new-password"
      /></label>
      <button class="btn-primary" :disabled="s.saving">Şifreyi değiştir</button>
    </form>

    <form class="card card-body space-y-4" @submit.prevent="saveGroup">
      <h2 class="text-lg font-semibold">Koleksiyon</h2>
      <label class="field"
        >Koleksiyon adı<input v-model="group.name" required
      /></label>
      <label class="field"
        >Para birimi<input
          v-model="group.currency"
          required
          maxlength="3"
          placeholder="TRY"
      /></label>
      <button class="btn-primary" :disabled="s.saving">
        Koleksiyonu kaydet
      </button>
    </form>

    <section class="card card-body space-y-4">
      <h2 class="text-lg font-semibold">Kullanıcı ekle</h2>
      <p class="muted">
        Davet kodu oluştur ve yeni kişiyle paylaş. Kişi giriş ekranındaki "Davet
        koduyla hesap oluştur" bölümünden kayıt olur.
      </p>
      <div class="grid grid-cols-2 gap-3">
        <label class="field"
          >Kullanım sayısı<input
            v-model.number="invite.uses"
            type="number"
            min="1"
            max="100"
        /></label>
        <label class="field"
          >Geçerlilik (gün)<input
            v-model.number="invite.days"
            type="number"
            min="1"
            max="365"
        /></label>
      </div>
      <button class="btn-secondary" :disabled="s.saving" @click="createInvite">
        <UserPlus :size="16" />Davet kodu oluştur
      </button>
      <div
        v-if="invitation"
        class="rounded-lg border border-gray-200 p-3 dark:border-neutral-700"
      >
        <p class="muted">Davet kodu</p>
        <div class="mt-1 flex items-center gap-2">
          <code
            class="min-w-0 flex-1 break-all text-sm"
            data-testid="invite-token"
            >{{ invitation.token }}</code
          >
          <button
            class="icon-button"
            aria-label="Davet kodunu kopyala"
            @click="copyToken"
          >
            <Copy :size="16" />
          </button>
        </div>
      </div>
    </section>

    <section class="card card-body lg:col-span-2">
      <h2 class="text-lg font-semibold">Koleksiyon üyeleri</h2>
      <p v-if="membersNote" class="muted mt-2">{{ membersNote }}</p>
      <p v-else-if="!members.length" class="muted mt-2">
        Gösterilecek üye yok.
      </p>
      <ul v-else class="mt-3 divide-y divide-gray-200 dark:divide-neutral-700">
        <li
          v-for="m in members"
          :key="m.id"
          class="flex items-center justify-between gap-3 py-3"
        >
          <div class="min-w-0">
            <p class="truncate text-sm font-medium">
              {{ m.name }}
              <span v-if="m.isOwner" class="badge-blue ms-1">Sahip</span>
            </p>
            <p class="muted truncate">{{ m.email }}</p>
          </div>
          <div v-if="!m.isOwner">
            <div v-if="confirmMember === m.id" class="flex items-center gap-2">
              <span class="text-xs">Çıkarılsın mı?</span>
              <button
                class="btn-danger !px-3 !py-1.5"
                @click="removeMember(m.id)"
              >
                Evet
              </button>
              <button
                class="btn-secondary !px-3 !py-1.5"
                @click="confirmMember = ''"
              >
                Vazgeç
              </button>
            </div>
            <button
              v-else
              class="icon-button"
              :aria-label="m.name + ' üyesini çıkar'"
              @click="confirmMember = m.id"
            >
              <Trash2 :size="16" />
            </button>
          </div>
        </li>
      </ul>
    </section>

    <section
      class="card card-body space-y-3 border-red-200 lg:col-span-2 dark:border-red-900"
    >
      <h2 class="text-lg font-semibold text-red-700 dark:text-red-400">
        Hesabı sil
      </h2>
      <p class="muted">
        Hesabın kalıcı olarak silinir. Onaylamak için e-posta adresini yaz.
      </p>
      <div class="flex flex-wrap gap-2">
        <input
          v-model="deleteText"
          class="input !w-72"
          aria-label="Silmeyi onayla"
          :placeholder="s.user?.email"
        />
        <button
          class="btn-danger"
          :disabled="s.saving || deleteText !== s.user?.email"
          @click="deleteAccount"
        >
          Hesabımı sil
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import { ArrowUpRight, Box, LoaderCircle } from "lucide-vue-next";
import { api, flash, handleError, login, loginForm, s, startDemo } from "../store";

const registering = ref(false);
const invite = reactive({ token: "", name: "", email: "", password: "" });

async function register() {
  registering.value = true;
  s.error = "";
  try {
    await api.register({ ...invite });
    loginForm.email = invite.email;
    Object.assign(invite, { token: "", name: "", email: "", password: "" });
    flash("Hesap oluşturuldu. Şimdi giriş yapabilirsin.");
  } catch (e) {
    handleError(e);
  } finally {
    registering.value = false;
  }
}
</script>

<template>
  <div class="grid min-h-screen lg:grid-cols-2">
    <div class="hidden flex-col justify-between bg-blue-600 p-12 text-white lg:flex">
      <div class="flex items-center gap-x-2 text-xl font-semibold">
        <Box :size="26" />homebox
      </div>
      <div>
        <h1 class="text-5xl font-bold tracking-tight">Evim.<br />Eşyalarım.<br />Düzenim.</h1>
        <p class="mt-6 max-w-md text-lg text-blue-100">
          Eşyalarının nerede olduğunu, ne zaman alındığını ve değerini bil. Evinin hafızası burada.
        </p>
      </div>
      <p class="text-sm text-blue-100">Senin evin. Senin verilerin.</p>
    </div>
    <main class="flex items-center justify-center p-6">
      <div class="w-full max-w-sm">
        <h2 class="text-3xl font-semibold tracking-tight">Evine hoş geldin.</h2>
        <p class="muted mt-3 mb-8">
          Homebox hesabınla giriş yap ve kaldığın yerden devam et.
        </p>
        <form class="space-y-5" @submit.prevent="login">
          <label class="field"
            >E-posta<input v-model="loginForm.email" type="email" autocomplete="username" required placeholder="sen@evin.com"
          /></label>
          <label class="field"
            >Şifre<input v-model="loginForm.password" type="password" autocomplete="current-password" required placeholder="Şifren"
          /></label>
          <details class="muted">
            <summary class="cursor-pointer">Bağlantı seçenekleri</summary>
            <label class="field mt-3"
              >Homebox API sürümü<select v-model="loginForm.mode">
                <option value="entities">Homebox 0.26.2 · Entities</option>
                <option value="legacy">Eski sürümler · Items</option>
              </select></label
            >
          </details>
          <div v-if="s.error" role="alert" class="alert-error">{{ s.error }}</div>
          <button type="submit" class="btn-primary w-full" :disabled="s.busy">
            <LoaderCircle v-if="s.busy" class="animate-spin" :size="18" />{{
              s.busy ? "Bağlanıyor…" : "Giriş yap"
            }}
          </button>
        </form>

        <details class="muted mt-6">
          <summary class="cursor-pointer">Davet koduyla hesap oluştur</summary>
          <form class="mt-3 space-y-4" @submit.prevent="register">
            <label class="field">Davet kodu<input v-model="invite.token" required autocomplete="off" /></label>
            <label class="field">Adın<input v-model="invite.name" required autocomplete="name" /></label>
            <label class="field">Hesap e-postası<input v-model="invite.email" type="email" required autocomplete="email" /></label>
            <label class="field">Yeni şifre<input v-model="invite.password" type="password" required minlength="8" autocomplete="new-password" /></label>
            <button type="submit" class="btn-secondary w-full" :disabled="registering">
              <LoaderCircle v-if="registering" class="animate-spin" :size="16" />Hesap oluştur
            </button>
          </form>
        </details>

        <div class="mt-7 border-t border-gray-200 pt-6 text-center dark:border-neutral-700">
          <button class="text-action" @click="startDemo">
            Örnek envanterle arayüzü keşfet<ArrowUpRight :size="14" />
          </button>
          <p class="muted mt-2 text-xs">Demo verileri yalnızca bu tarayıcı oturumunda kullanılır.</p>
        </div>
      </div>
    </main>
  </div>
</template>

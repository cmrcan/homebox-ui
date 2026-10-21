<script setup lang="ts">
import { reactive, ref } from "vue";
import { ArrowLeft, Eye, EyeOff, LoaderCircle } from "lucide-vue-next";
import HomeboxBrand from "./HomeboxBrand.vue";
import { api, flash, handleError, login, loginForm, s } from "../store";
const showRegistration = ref(false);
const showPassword = ref(false);
const registering = ref(false);
const invite = reactive({ token: "", name: "", email: "", password: "" });
function toggleRegistration() {
  showRegistration.value = !showRegistration.value;
  showPassword.value = false;
  s.error = "";
}
async function register() {
  registering.value = true;
  s.error = "";
  try {
    await api.register({ ...invite });
    loginForm.email = invite.email;
    Object.assign(invite, { token: "", name: "", email: "", password: "" });
    showRegistration.value = false;
    flash("Hesap oluşturuldu. Şimdi giriş yapabilirsin.");
  } catch (e) {
    handleError(e);
  } finally {
    registering.value = false;
  }
}
</script>

<template>
  <main class="login-page">
    <div class="w-full max-w-md">
      <div class="mb-8 flex justify-center"><HomeboxBrand /></div>
      <section class="card p-6 sm:p-9">
        <div class="mb-7 text-center">
          <h1 class="text-[1.75rem] font-semibold tracking-tight">
            {{ showRegistration ? "Hesabını oluştur." : "Evine hoş geldin." }}
          </h1>
          <p class="muted mt-2">
            {{
              showRegistration
                ? "Davet kodunla Homebox’a katıl."
                : "Eşyaların ve evine ait tüm bilgiler bir arada."
            }}
          </p>
        </div>
        <form
          v-if="!showRegistration"
          class="space-y-5"
          @submit.prevent="login"
        >
          <label class="field"
            >E-posta<input
              v-model="loginForm.email"
              type="email"
              inputmode="email"
              autocomplete="username"
              autocapitalize="none"
              spellcheck="false"
              required
              placeholder="E-posta adresin"
          /></label>
          <div>
            <label class="field" for="login-password">Şifre</label>
            <div class="relative mt-2">
              <input
                id="login-password"
                v-model="loginForm.password"
                class="input !mt-0 pe-14"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                required
                placeholder="Şifren"
              />
              <button
                type="button"
                class="icon-button absolute end-1 top-1/2 -translate-y-1/2"
                :aria-label="showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'"
                :aria-pressed="showPassword"
                @click="showPassword = !showPassword"
              >
                <EyeOff v-if="showPassword" :size="21" /><Eye
                  v-else
                  :size="21"
                />
              </button>
            </div>
          </div>
          <div v-if="s.error" role="alert" class="alert-error">
            {{ s.error }}
          </div>
          <button type="submit" class="btn-primary w-full" :disabled="s.busy">
            <LoaderCircle v-if="s.busy" class="animate-spin" :size="21" />{{
              s.busy ? "Giriş yapılıyor…" : "Giriş yap"
            }}
          </button>
        </form>
        <form v-else class="space-y-5" @submit.prevent="register">
          <label class="field"
            >Davet kodu<input
              v-model="invite.token"
              required
              autocomplete="off"
          /></label>
          <label class="field"
            >Adın<input v-model="invite.name" required autocomplete="name"
          /></label>
          <label class="field"
            >E-posta<input
              v-model="invite.email"
              type="email"
              inputmode="email"
              required
              autocomplete="email"
              autocapitalize="none"
          /></label>
          <label class="field"
            >Şifre<input
              v-model="invite.password"
              type="password"
              required
              minlength="8"
              autocomplete="new-password"
          /></label>
          <div v-if="s.error" role="alert" class="alert-error">
            {{ s.error }}
          </div>
          <button
            type="submit"
            class="btn-primary w-full"
            :disabled="registering"
          >
            <LoaderCircle
              v-if="registering"
              class="animate-spin"
              :size="21"
            />Hesap oluştur
          </button>
        </form>
      </section>
      <div class="mt-4 text-center">
        <button
          type="button"
          class="text-action justify-center"
          :disabled="s.busy || registering"
          @click="toggleRegistration"
        >
          <ArrowLeft v-if="showRegistration" :size="18" />{{
            showRegistration
              ? "Giriş ekranına dön"
              : "Davet koduyla hesap oluştur"
          }}
        </button>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import logo from "../assets/homebox-logo.svg?raw";
</script>

<template>
  <span class="homebox-brand">
    <!-- Trusted, bundled SVG: inlining lets the supplied logo inherit the theme. -->
    <span class="homebox-logo" v-html="logo"></span>
  </span>
</template>

<script setup>
defineProps(['modelValue']);
defineEmits(['update:modelValue']);
</script>

<template>
  <aside class="sidebar">
    <nav class="nav-menu">
      <button :class="{ active: modelValue === 'dashboard' }" @click="$emit('update:modelValue', 'dashboard')">Dashboard</button>
      <button :class="{ active: modelValue === 'rocket-academy' }" @click="$emit('update:modelValue', 'rocket-academy')">Rocket Academy</button>
      <button :class="{ active: modelValue === 'kasper-academy' }" @click="$emit('update:modelValue', 'kasper-academy')">Kasper Academy</button>
    </nav>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 200px;
  background-color: var(--sidebar-bg);
  color: var(--text-color);
  display: flex;
  flex-direction: column;
  padding-top: 10px;
  border-right: 1px solid var(--border-color);
  margin-bottom: 1rem;
  border-bottom-right-radius: 8px;
}

.nav-menu {
  display: flex;
  flex-direction: column;
  padding: 10px 0;
}

.nav-menu button {
  background: transparent;
  color: var(--text-muted);
  border: none;
  padding: 12px 24px;
  text-align: left;
  cursor: pointer;
  font-size: 15px;
  font-weight: 500;
  transition: all 0.2s ease;
  border-left: 3px solid transparent;
}

.nav-menu button:hover {
  background-color: rgba(255, 255, 255, 0.05);
  color: var(--text-color);
}

.nav-menu button.active {
  background-color: rgba(57, 108, 216, 0.1);
  color: var(--accent-color);
  border-left-color: var(--accent-color);
}
</style>

<template>
    <div class="card-header">
       <div class="header-top">
           <div class="title-group">
               <span class="icon">{{ icon }}</span>
               <h3>{{ title }}</h3>
               <div class="strategy-actions">
                    <button class="icon-btn-tiny" @click="$emit('open-history')" title="Historique">📜</button>
                    <button class="icon-btn-tiny" @click="$emit('open-mm')" title="Règles MM">⚖️</button>
               </div>
           </div>
           
           <div class="header-status" v-if="strategy === 'wheel' || strategy === 'pcs' || strategy === 'rockets'">
                <span class="badge latent" :class="plLatent >= 0 ? 'green' : 'red'" v-if="strategy === 'wheel'">
                   Latent: {{ formattedPlLatent }}
               </span>
           </div>
       </div>
    </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
    strategy: String,
    title: String,
    icon: String,
    plLatent: Number
});

defineEmits(['open-history', 'open-mm']);

const formattedPlLatent = computed(() => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(props.plLatent || 0);
});
</script>

<style scoped>
.card-header .header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.title-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.title-group h3 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 700;
    color: #e0e0e0;
}

.strategy-actions {
    display: flex;
    gap: 0.25rem;
    margin-left: 0.5rem;
}

.icon-btn-tiny {
    background: rgba(255,255,255,0.1);
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
    padding: 2px 6px;
    transition: background 0.2s;
}
.icon-btn-tiny:hover { background: rgba(255,255,255,0.2); }

/* Theme handling via Parent CSS usually, but here we scope minimal needed */
/* The parent .theme-wheel handles the color override via :deep or plain since this is scoped, wait. 
   Scoped styles here won't be affected by parent .theme-wheel unless we use slots or careful css.
   Actually, the parent sets the class. If we use scoped style here, it won't react to parent class automatically for colors.
   Let's keep the structured CSS but colors might need to be passed or handled via :deep in parent.
   However, the original CSS targeted .rocket-strategy-card.theme-wheel .card-header...
   So if I move the HTML here, the parent CSS selectors might break if they were scoped in Parent.
   Yes, parent styles were scoped.
   I need to rely on passed props or simple standard styling, OR allow parent to style this via :deep()
   The original CSS:
   .rocket-strategy-card.theme-wheel .card-header .title-group .icon { color: ... }
   Use :deep in parent is easier.
*/

.badge.latent {
    font-size: 0.8rem;
    padding: 3px 8px;
    border-radius: 4px;
    font-weight: bold;
    background: rgba(255,255,255,0.1);
}
.badge.green { color: #4ade80; background: rgba(74, 222, 128, 0.1); }
.badge.red { color: #f87171; background: rgba(248, 113, 113, 0.1); }
</style>

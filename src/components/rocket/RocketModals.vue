<template>
  <div class="rocket-modals">
    <MmSettingsModal
      :show="showSettings"
      :mmConfig="mmConfig"
      @update:show="$emit('update:showSettings', $event)"
      @save="$emit('save-mm-settings')"
      @update-capital="$emit('update-capital')"
    />

    <AssignTradeModal
      :show="showAssignModal"
      :trade="tradeToAssign"
      @update:show="$emit('update:showAssignModal', $event)"
      @confirm="$emit('confirm-assignment')"
    />

    <StatusChangeModal
      :show="showStatusModal"
      :pendingUpdate="pendingStatusUpdate"
      @update:show="$emit('update:showStatusModal', $event)"
      @confirm="(price) => $emit('confirm-status-update', price)"
    />

    <DeleteTradeModal
      :show="showDeleteModal"
      :trade="tradeToDelete"
      @update:show="$emit('update:showDeleteModal', $event)"
      @confirm="$emit('confirm-delete')"
    />
  </div>
</template>

<script setup>
import MmSettingsModal from './modals/MmSettingsModal.vue';
import AssignTradeModal from './modals/AssignTradeModal.vue';
import StatusChangeModal from './modals/StatusChangeModal.vue';
import DeleteTradeModal from './modals/DeleteTradeModal.vue';

defineProps({
    showSettings: Boolean,
    mmConfig: { type: Object, required: true },
    showAssignModal: Boolean,
    tradeToAssign: Object,
    showStatusModal: Boolean,
    pendingStatusUpdate: Object,
    showDeleteModal: Boolean,
    tradeToDelete: Object
});

defineEmits([
    'update:showSettings',
    'update:showAssignModal',
    'update:showStatusModal',
    'update:showDeleteModal',
    'save-mm-settings',
    'confirm-assignment',
    'confirm-status-update',
    'confirm-delete',
    'update-capital'
]);
</script>

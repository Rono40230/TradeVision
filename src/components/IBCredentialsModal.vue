<template>
  <div class="credentials-modal">
    <div class="modal-overlay" @click="$emit('close')"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h3>🔐 IB Gateway Credentials</h3>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>

      <div class="modal-body">
        <p class="info-text">
          Configure your IB Gateway credentials for automatic trade synchronization.
        </p>

        <div v-if="warningMessage" class="warning-box">
          ⚠️ {{ warningMessage }}
        </div>

        <form @submit.prevent="handleSave">
          <div class="form-group">
            <label for="username">Username</label>
            <input
              id="username"
              v-model="form.username"
              type="text"
              placeholder="Your IB Gateway username"
              autocomplete="off"
              required
            />
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input
              id="password"
              v-model="form.password"
              type="password"
              placeholder="Your IB Gateway password"
              autocomplete="off"
              required
            />
          </div>

          <div class="form-group">
            <label for="host">IB Gateway Host (optional)</label>
            <input
              id="host"
              v-model="form.host"
              type="text"
              placeholder="localhost"
            />
          </div>

          <div class="form-group">
            <label for="port">IB Gateway Port (optional)</label>
            <input
              id="port"
              v-model="form.port"
              type="number"
              placeholder="7496"
            />
          </div>

          <div class="info-box">
            <strong>ℹ️ Note:</strong>
            <ul>
              <li>Use your <strong>Paper Trading</strong> account credentials</li>
              <li>IB Gateway must be running on localhost:7496</li>
              <li>Read-only mode is enforced (no trading possible)</li>
              <li>Credentials are stored locally in environment variables</li>
            </ul>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn-save" :disabled="isSaving">
              {{ isSaving ? 'Testing connection...' : 'Test & Save' }}
            </button>
            <button type="button" class="btn-cancel" @click="$emit('close')">
              Cancel
            </button>
          </div>

          <div v-if="successMessage" class="success-box">
            ✅ {{ successMessage }}
          </div>

          <div v-if="errorMessage" class="error-box">
            ❌ {{ errorMessage }}
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const emit = defineEmits(['close', 'save'])

const form = ref({
  username: '',
  password: '',
  host: 'localhost',
  port: '7496',
})

const isSaving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const warningMessage = ref(
  'Ensure you are using a Paper Trading account for security.'
)

const handleSave = async () => {
  errorMessage.value = ''
  successMessage.value = ''

  if (!form.value.username || !form.value.password) {
    errorMessage.value = 'Username and password are required'
    return
  }

  isSaving.value = true

  try {
    // Test connection to IB Gateway
    const response = await fetch(
      `http://${form.value.host}:${form.value.port}/iserver/auth/status`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.value.username,
          password: form.value.password,
        }),
      }
    )

    if (!response.ok) {
      throw new Error('IB Gateway authentication failed')
    }

    successMessage.value =
      'Connection successful! Credentials saved. Sync will start automatically.'
    emit('save', {
      username: form.value.username,
      password: form.value.password,
      host: form.value.host,
      port: form.value.port,
    })

    // Close modal after 2 seconds
    setTimeout(() => emit('close'), 2000)
  } catch (error) {
    errorMessage.value = `Connection test failed: ${error.message}`
  } finally {
    isSaving.value = false
  }
}
</script>

<style scoped>
.credentials-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
}

.modal-content {
  position: relative;
  z-index: 1001;
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #eee;
}

.modal-header h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.25rem;
}

.close-btn {
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  color: #999;
  transition: color 0.2s;
}

.close-btn:hover {
  color: #333;
}

.modal-body {
  padding: 1.5rem;
  max-height: 80vh;
  overflow-y: auto;
}

.info-text {
  color: #666;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.warning-box {
  padding: 0.75rem;
  background: #fff3cd;
  border-left: 4px solid #ff9800;
  color: #856404;
  margin-bottom: 1rem;
  border-radius: 4px;
  font-size: 0.9rem;
}

.info-box {
  padding: 1rem;
  background: #e3f2fd;
  border-left: 4px solid #2196f3;
  color: #0d47a1;
  margin: 1rem 0;
  border-radius: 4px;
  font-size: 0.9rem;
}

.info-box ul {
  margin: 0.5rem 0 0 0;
  padding-left: 1.5rem;
}

.info-box li {
  margin: 0.25rem 0;
}

.form-group {
  margin-bottom: 1rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #2c3e50;
  font-size: 0.9rem;
}

input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

input:focus {
  outline: none;
  border-color: #2196f3;
  box-shadow: 0 0 4px rgba(33, 150, 243, 0.2);
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin: 1.5rem 0;
}

.btn-save,
.btn-cancel {
  flex: 1;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 1rem;
}

.btn-save {
  background: linear-gradient(135deg, #2196f3 0%, #1976d2 100%);
  color: white;
}

.btn-save:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
}

.btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-cancel {
  background: #f5f5f5;
  color: #2c3e50;
  border: 1px solid #ddd;
}

.btn-cancel:hover {
  background: #eee;
}

.success-box {
  padding: 0.75rem;
  background: #d4edda;
  border-left: 4px solid #28a745;
  color: #155724;
  margin-top: 1rem;
  border-radius: 4px;
  font-size: 0.9rem;
}

.error-box {
  padding: 0.75rem;
  background: #f8d7da;
  border-left: 4px solid #dc3545;
  color: #721c24;
  margin-top: 1rem;
  border-radius: 4px;
  font-size: 0.9rem;
}
</style>

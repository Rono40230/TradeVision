/**
 * Initializes IB sync scheduler on app startup
 * Can be called from App.vue onMounted
 */

import { useIBSyncScheduler } from '../composables/useIBSyncScheduler'
import { initDB } from '../utils/db'

let schedulerInstance = null

export async function initIBSyncScheduler() {
  try {
    const db = await initDB()
    const scheduler = useIBSyncScheduler()

    // Start background sync every 30 minutes
    await scheduler.initScheduler(db)

    schedulerInstance = scheduler
    console.log('[App] IB Sync Scheduler initialized - will check sync need every 30 minutes')

    return scheduler
  } catch (error) {
    console.error('[App] Failed to initialize IB Sync Scheduler:', error)
    return null
  }
}

export function stopIBSyncScheduler() {
  if (schedulerInstance) {
    schedulerInstance.stopScheduler()
    console.log('[App] IB Sync Scheduler stopped')
  }
}

export function getIBSyncScheduler() {
  return schedulerInstance
}

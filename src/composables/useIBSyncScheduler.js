import { ref } from 'vue'
import { useIBSync } from './useIBSync'

/**
 * Composable for automated IB trade synchronization
 * Syncs once per 24 hours via Tauri timer or on-demand
 */
export function useIBSyncScheduler() {
  const isScheduling = ref(false)
  const nextSyncTime = ref(null)
  const schedulerStatus = ref('idle') // 'idle' | 'waiting' | 'syncing'
  let syncIntervalId = null

  /**
   * Initialize background scheduler (checks sync need every 30 min)
   */
  const initScheduler = async (db) => {
    if (syncIntervalId) return // Already running

    isScheduling.value = true
    schedulerStatus.value = 'waiting'

    // Check and sync every 30 minutes
    syncIntervalId = setInterval(async () => {
      try {
        const metadata = await db.select(
          `SELECT last_sync_date FROM sync_metadata WHERE account_id = 'IBKR' LIMIT 1`
        )

        if (metadata.length === 0) {
          // Never synced, do it now
          await performSync(db, 'IBKR')
        } else {
          const lastSync = new Date(metadata[0].last_sync_date)
          const now = new Date()
          const hoursSinceSync = (now - lastSync) / (1000 * 60 * 60)

          // Sync if 24+ hours passed
          if (hoursSinceSync >= 24) {
            await performSync(db, 'IBKR')
          } else {
            // Calculate next sync time
            const nextSync = new Date(lastSync.getTime() + 24 * 60 * 60 * 1000)
            nextSyncTime.value = nextSync.toISOString()
            schedulerStatus.value = 'waiting'
          }
        }
      } catch (error) {
        console.error('[IBSyncScheduler] Error in scheduler loop:', error)
      }
    }, 30 * 60 * 1000) // Check every 30 minutes
  }

  /**
   * Stop background scheduler
   */
  const stopScheduler = () => {
    if (syncIntervalId) {
      clearInterval(syncIntervalId)
      syncIntervalId = null
      isScheduling.value = false
      schedulerStatus.value = 'idle'
    }
  }

  /**
   * Perform single sync operation
   */
  const performSync = async (db, accountId) => {
    try {
      schedulerStatus.value = 'syncing'
      const { syncFromIB } = useIBSync()

      // Use useIBSync to handle the actual sync (which calls invoke internally)
      const flexToken = localStorage.getItem('flex_token')
      const flexQueryId = parseInt(localStorage.getItem('flex_query_id') || '0')
      if (!flexToken || !flexQueryId) {
        throw new Error('Flex Token et Query ID non configurés dans HISTORIQUE IB')
      }
      await syncFromIB(db, flexToken, flexQueryId)

      // Get metadata after sync
      const metadata = await db.select(
        `SELECT last_sync_date, trades_synced FROM sync_metadata WHERE account_id = ? LIMIT 1`,
        [accountId]
      )

      if (metadata.length > 0) {
        nextSyncTime.value = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        console.log(`[IBSyncScheduler] Synced ${metadata[0].trades_synced} trades successfully`)
      }

      schedulerStatus.value = 'waiting'
    } catch (error) {
      console.error('[IBSyncScheduler] Sync failed:', error)
      schedulerStatus.value = 'error'
      throw error
    }
  }

  return {
    isScheduling,
    nextSyncTime,
    schedulerStatus,
    initScheduler,
    stopScheduler,
    performSync,
  }
}

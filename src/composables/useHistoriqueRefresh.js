/**
 * Signal de rafraîchissement de l'historique.
 * Module-level : partagé entre FlexQueryAnalytics et HistoriqueComplet
 * sans prop drilling ni store lourd.
 *
 * Usage émission  : histRefreshToken.value++
 * Usage écoute    : watch(histRefreshToken, () => loadTrades())
 */
import { ref } from 'vue'

export const histRefreshToken = ref(0)

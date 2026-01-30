<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-content bento-card">
      <header class="modal-header">
        <h3>Règles de Money Management : {{ strategyTitle }}</h3>
        <button class="close-btn" @click="$emit('close')">×</button>
      </header>
      
      <div class="modal-body">
        
        <!-- STRATÉGIE THEME -->
        <div class="strategy-theme-stripe" :class="strategy"></div>

        <p class="intro-text">
            Cette modale résume comment le capital utilisé et disponible est calculé pour la stratégie <strong>{{ strategyTitle }}</strong> au sein du journal.
        </p>

        <!-- WHEEL SECTION -->
        <div v-if="strategy === 'wheel'" class="rules-container">
            <div class="rule-block">
                <h4>💰 Allocation Globale</h4>
                <p>
                    L'allocation est <strong>dynamique</strong>. Elle correspond à votre capital de base dédié au Wheel, augmenté de la <strong>marge autorisée</strong> (définie en %).
                </p>
                <div class="formula">
                    Capital Total = Alloc. Base + (Alloc. Base × % Marge)
                </div>
            </div>

            <div class="rule-block">
                <h4>🛡️ Options (CSP)</h4>
                <p>
                    Pour les Puts vendus (Cash Secured Puts), le capital est considéré comme bloqué pour sécuriser l'assignation potentielle.
                </p>
                <div class="formula">
                    Capital Utilisé = Strike × 100 × Quantité
                </div>
            </div>

            <div class="rule-block">
                <h4>📦 Actions Assignées</h4>
                <p>
                    Lorsqu'une position est assignée (Stock), le capital mobilisé correspond à la valeur d'achat ou d'assignation.
                </p>
                <div class="formula">
                    Capital Utilisé = Prix d'Entrée × 100 × Quantité
                </div>
            </div>
        </div>

        <!-- PCS SECTION -->
        <div v-if="strategy === 'pcs'" class="rules-container">
             <div class="rule-block">
                <h4>💰 Allocation Globale</h4>
                <p>
                    L'allocation est une <strong>enveloppe fixe</strong> ("Growth") définie dans vos réglages globaux. Elle sert de limite stricte au collatéral engagé.
                </p>
            </div>

            <div class="rule-block">
                <h4>🔒 Collatéral (Buying Power Reduction)</h4>
                <p>
                    Le capital utilisé correspond au <strong>risque maximum</strong> défini par la largeur des spreads, moins le crédit reçu.
                </p>
                <div class="formula">
                    <strong>Vertical Spread :</strong> (Largeur Spread - Crédit) × 100 × Qté
                    <br>
                    <strong>Iron Condor :</strong> Max(Aile Put, Aile Call) - Crédit Global
                </div>
            </div>
        </div>

        <!-- ROCKETS SECTION -->
        <div v-if="strategy === 'rockets'" class="rules-container">
            <div class="rule-block">
                <h4>💰 Allocation Globale</h4>
                <p>
                    L'allocation est une <strong>enveloppe spéculative fixe</strong> définie dans vos réglages. C'est votre budget "risque pur".
                </p>
            </div>

            <div class="rule-block">
                <h4>🚀 Coût de la Position</h4>
                <p>
                    Le capital est débité dès l'entrée en position. Le calcul est basé sur le coût réel d'acquisition.
                </p>
                <div class="formula">
                    Capital Utilisé = Prix d'Entrée × Quantité
                </div>
            </div>

            <div class="rule-block">
                <h4>🚦 Statuts Actifs</h4>
                <p>
                    Sont comptabilisés dans l'utilisation du capital :
                </p>
                <ul>
                    <li>Positions <strong>OUVERTES</strong> (En cours)</li>
                    <li>Positions <strong>PENDING</strong> (Ordres limites posés)</li>
                    <li>Positions <strong>NEUTRALISÉES</strong> (Stop à breakeven, mais capital toujours engagé)</li>
                </ul>
            </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  strategy: {
    type: String, // 'wheel', 'pcs', 'rockets'
    required: true
  }
});

const strategyTitle = computed(() => {
    switch(props.strategy) {
        case 'wheel': return 'The Wheel (Cash Secured)';
        case 'pcs': return 'Put Credit Spreads (Growth)';
        case 'rockets': return 'Rockets (Directionnel)';
        default: return props.strategy.toUpperCase();
    }
});
</script>

<style scoped src="./rocket-mm-modal.css"></style>

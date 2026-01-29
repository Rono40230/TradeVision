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

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0; left: 0;
  width: 100vw; height: 100vh;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: #1e1e1e;
  width: 100%;
  max-width: 600px;
  border-radius: 12px;
  border: 1px solid #333;
  box-shadow: 0 20px 50px rgba(0,0,0,0.5);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: modalPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes modalPop {
    from { opacity: 0; transform: scale(0.95) translateY(10px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: #252526;
  border-bottom: 1px solid #333;
}

.modal-header h3 {
    margin: 0;
    font-size: 1.1rem;
    color: #e0e0e0;
}

.close-btn {
  background: none;
  border: none;
  color: #888;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}
.close-btn:hover { color: #fff; }

.modal-body {
    padding: 1.5rem;
    position: relative;
    max-height: 80vh;
    overflow-y: auto;
}

.strategy-theme-stripe {
    height: 4px;
    width: 100%;
    position: absolute;
    top: 0;
    left: 0;
}
.strategy-theme-stripe.wheel { background: #4CAF50; box-shadow: 0 0 10px rgba(76, 175, 80, 0.4); }
.strategy-theme-stripe.pcs { background: #2196F3; box-shadow: 0 0 10px rgba(33, 150, 243, 0.4); }
.strategy-theme-stripe.rockets { background: #9C27B0; box-shadow: 0 0 10px rgba(156, 39, 176, 0.4); }

.intro-text {
    color: #aaa;
    margin-bottom: 1.5rem;
    font-size: 0.95rem;
    line-height: 1.5;
}

.rules-container {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.rule-block h4 {
    margin: 0 0 0.5rem 0;
    color: #fff;
    font-size: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.rule-block p {
    margin: 0 0 0.8rem 0;
    color: #ccc;
    font-size: 0.9rem;
    line-height: 1.5;
}

.formula {
    background: #111;
    border-left: 3px solid #666;
    padding: 0.8rem;
    font-family: 'Roboto Mono', monospace;
    font-size: 0.85rem;
    color: #81C784; /* Light Green default */
    border-radius: 0 4px 4px 0;
}

/* Specific Formula Colors match themes */
.wheel .formula { border-color: #4CAF50; color: #A5D6A7; }
.pcs .formula { border-color: #2196F3; color: #90CAF9; }
.rockets .formula { border-color: #9C27B0; color: #CE93D8; }

ul {
    margin: 0;
    padding-left: 1.5rem;
    color: #ccc;
    font-size: 0.9rem;
}
li { margin-bottom: 0.3rem; }

/* Scrollbar */
.modal-body::-webkit-scrollbar { width: 6px; }
.modal-body::-webkit-scrollbar-track { background: #1e1e1e; }
.modal-body::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; }
</style>

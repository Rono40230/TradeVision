# Tâches du Projet Journal Rocket Trading

## 🚀 Refonte Dashboard "Cockpit" (En cours)
Objectif : Créer un tableau de bord unifié et responsive regroupant les univers Kasper (Investissement) et Rocket (Trading) sur un seul écran "Cockpit".

### 1. Architecture & Structure (Squelette)
- [ ] Créer la vue principale `DashboardCockpit.vue` (Layout Grid/Bento).
- [ ] Définir la structure responsive (CSS Grid : Zone Kasper / Zone Rocket / Zone Alertes).
- [ ] Créer le `DashboardHeaderGlobal.vue` (Net Liq Total, P/L Jour Global).

### 2. Composants "Bloc Kasper" (Gauche/Haut)
- [ ] Créer `KasperSummaryCard.vue` (KPIs globaux + Bouton Règles MM).
- [ ] Créer `KasperAccountCard.vue` (Widget par compte).
    - [ ] Affichage compact : Nom, Capital, Var%, Sparkline (Mini-Graph), Pastille Santé.
    - [ ] Mode étendu (Expand) : Grand graphique, Analyse détaillée, Conseils.
- [ ] Intégration des données réelles (store Kasper).

### 3. Composants "Bloc Rocket" (Droite/Bas)
- [ ] Créer `RocketSummaryCard.vue` (KPIs globaux : Cash, Marge, P/L Latent + Bouton Historique Global).
- [ ] Créer la **"Carte d'Alerte Globale"** (`RocketAlertsCard.vue`).
    - [ ] Logique détection Assignations proches (ITM < 5 jours).
    - [ ] Logique détection Volatilité Rockets.
    - [ ] Logique Surcharge Marge.
- [ ] Créer `RocketStrategyCard.vue` (Générique pour Wheel, PCS, Rockets).
    - [ ] Header : Nom Stratégie + P/L.
    - [ ] Corps : Jauge MM (Barre progression).
    - [ ] Footer : Actions rapides (Règles MM, Historique filtré, Graphique).
    - [ ] Tooltip/Pop-over : Analyse "Critiques et Conseils".
- [ ] Intégration des données réelles (store Rocket).

### 4. Modales & Navigation
- [ ] Créer/Adapter la modale `MoneyManagementRules.vue` (Contenu dynamique selon la stratégie).
- [ ] Créer la vue `GlobalTradeHistory.vue` (Tableau filtrable de tous les trades).
- [ ] Connecter les boutons "Historique" des cartes vers cette vue (avec filtres pré-remplis).

### 5. Finalisation & UI
- [ ] Polissage CSS (Thèmes couleurs : Bleu/Violet Kasper vs Sombre/Vert Rocket).
- [ ] Responsive Testing (Mobile vs Desktop).
- [ ] Audit de performances (Lazy loading des graphiques lourds).

---

## ✅ Tâches Terminées
- [x] Refactor RocketAcademy pour Audit (Règle 16).
- [x] Implémentation CCS Roll (Modale + Boutons colorés).
- [x] Fix unwrap() Rust (Lib.rs).
- [x] Création des scénarios Gherkin pour les stratégies.
- [x] Mise en place de l'environnement de test (Vitest).
- [x] Installation Vibe Framework & Audit initial.

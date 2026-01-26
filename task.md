1. Navigation et Structure (Le Wrapper)
 Onglets : Vérifier que le basculement entre les vues "Kasper (Wheel)", "Kasper (PCS)" et "Rocket" fonctionne et affiche bien les bons tableaux.
 Passage de Props : Vérifier que les tableaux ne sont pas vides (si des données existent). Si vides > Problème de transmission de la prop trades depuis ActiveTradesList.

2. Stratégie Rocket (La plus impactée)
Le découpage en 4 sous-tableaux (Pending, Risk, Neutralized, Closed) est la zone la plus à risque.

A. Catégorisation des Trades :

 Pending : Un trade statut "Pending" apparaît-il bien uniquement dans le 1er tableau ?
 Risk (Open) : Un trade statut "Open" apparaît-il bien dans le 2ème tableau ?
 Neutralized/BE : Un trade "BreakEven" ou "Neutralized" apparaît-il dans le 3ème tableau ?
 Closed/Stopped : Un trade "Closed" apparaît-il dans le dernier tableau ?
B. Cycle de Vie (Workflow) - Testez les boutons :

 Activation : Dans le tableau Pending, le clic sur "Activer" ouvre-t-il la modale d'activation ? (Vérifier que l'événement @activate remonte bien).
 Neutralisation : Dans le tableau Risk, le bouton "Sécuriser/Neutraliser" ouvre-t-il la modale ?
 Clôture : Les boutons de clôture (Partielle ou Totale) fonctionnent-ils dans les tableaux Risk et Neutralized ?
 Suppression : Le bouton poubelle fonctionne-t-il dans Pending et Closed ?
C. Calculs & Affichage (Régressions visuelles possibles) :

 Couleurs P/L : Le code couleur (Vert/Rouge) pour les PV/MV s'applique-t-il correctement ? (J'ai touché aux classes CSS).
 Badges : Les badges "Type" (Action, Crypto, etc.) s'affichent-ils ?
 Risk/Reward (RR) : Le calcul du RR s'affiche-t-il (ex: "2.5 R") ou est-il vide/NaN ?
 Dates : Les dates s'affichent-elles au bon format (JJ/MM/YYYY) ou en format ISO brut ?

3. Stratégies Kasper (Wheel & PCS)
Elles ont été déplacées dans WheelTradesTable.vue et PcsTradesTable.vue.

 Assignation : Le bouton "Assignation" (visible uniquement si Short Put) est-il présent et cliquable ?
 Édition Rapide : Si vous aviez des champs éditables directement dans le tableau (ex: date, strike), fonctionnent-ils toujours ?
 Filtres : Si l'ancienne vue avait des filtres colonnes, sont-ils toujours là ?

4. Données Temps Réel (useLivePrices)
 Rafraîchissement : Les prix "Mark" ou "Actuel" se mettent-ils à jour ou restent-ils fixes ?
 Spinner : Voyez-vous un indicateur de chargement en haut des tableaux si les données chargent ?
 
5. Styles CSS (Scope)
J'ai déplacé le CSS dans des fichiers séparés avec scoped.

 Tableaux : La largeur des colonnes est-elle conservée ?
 Alignement : Les boutons d'action sont-ils bien alignés ou décalés ?
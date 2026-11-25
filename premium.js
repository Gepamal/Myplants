"use strict";
// Animations de l'aperçu : transitions entre écrans et validation animée des tâches.
(() => {
  const body = document.body;
  const transition = () => {
    body.classList.remove("transition");
    void body.offsetWidth; // relance l'animation
    body.classList.add("transition");
    clearTimeout(transition.t);
    transition.t = setTimeout(() => body.classList.remove("transition"), 900);
  };
  transition();
  window.addEventListener("hashchange", transition);

  // "Fait" : on joue l'animation de la carte, puis on laisse l'app enregistrer.
  document.addEventListener("click", (e) => {
    const b = e.target.closest('button[data-a="fait"]');
    if (!b || b.dataset.anime) return;
    const carte = b.closest(".tache");
    if (!carte || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    e.stopImmediatePropagation();
    e.preventDefault();
    b.dataset.anime = "1";
    carte.classList.add("valide");
    setTimeout(() => b.onclick && b.onclick(), 380);
  }, true);
})();

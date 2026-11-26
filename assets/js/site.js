// Interactions du site, en JavaScript natif. Sans JavaScript, tout reste lisible :
// le bouton « Formulaire de contact » mène à la page Contact, le panneau
// et tous les onglets sont visibles.
(() => {
  "use strict";

  // Fenêtre de contact (<dialog> natif : focus, Échap et
  // retour du focus sur le bouton d'origine sont gérés par le navigateur).
  for (const declencheur of document.querySelectorAll("[data-ouvre]")) {
    declencheur.addEventListener("click", (evt) => {
      const dialogue = document.getElementById(declencheur.dataset.ouvre);
      if (!dialogue || typeof dialogue.showModal !== "function") return;
      evt.preventDefault();
      dialogue.showModal();
      // Focus sur le contenu plutôt que sur la croix de fermeture : pas de
      // contour de focus inutile à l'ouverture ; Tab mène ensuite aux boutons.
      dialogue.querySelector("[data-focus-initial]")?.focus();
    });
  }
  for (const dialogue of document.querySelectorAll("dialog")) {
    for (const bouton of dialogue.querySelectorAll("[data-ferme]")) {
      bouton.addEventListener("click", () => dialogue.close());
    }
    // Clic sur le fond assombri : fermeture.
    dialogue.addEventListener("click", (evt) => {
      if (evt.target === dialogue) dialogue.close();
    });
  }

  // Partage de la page : feuille de partage native du téléphone ou de l'ordinateur (Web Share),
  // sinon copie du lien dans le presse-papiers, avec un court message de confirmation.
  for (const bouton of document.querySelectorAll("[data-partage]")) {
    const retour = bouton.querySelector(".partage__retour");
    const lien = document.querySelector('link[rel="canonical"]')?.href || location.href.split("#")[0];
    const titre = document.title;
    const texte = document.querySelector('meta[name="description"]')?.content ?? "";
    let minuteur = 0;
    const confirmer = (message) => {
      if (!retour) return;
      retour.textContent = message;
      clearTimeout(minuteur);
      minuteur = setTimeout(() => { retour.textContent = ""; }, 2200);
    };
    bouton.addEventListener("click", async () => {
      if (navigator.share) {
        try { await navigator.share({ title: titre, text: texte, url: lien }); } catch { /* partage annulé */ }
        return;
      }
      try {
        await navigator.clipboard.writeText(lien);
        confirmer(bouton.dataset.lienCopie);
      } catch {
        window.prompt(bouton.getAttribute("aria-label") ?? "", lien);
      }
    });
  }

  // Cartes dépliables (02 « Pour qui », 04 « Avec qui », 05 « Comment ») : s'ouvrent en grand au clic.
  // - Carte 05 : son contenu est masqué quand elle est fermée.
  // - Carte 04 (« partielle ») : fermée, elle montre l'onglet Parcours sans la barre
  //   d'onglets ; ouverte, tous les onglets ; elle revient sur Parcours à la fermeture.
  // Sur grand écran, une seule carte ouverte à la fois, et la carte 1 garde sa hauteur.
  // Sur mobile (une seule colonne), les cartes s'ouvrent indépendamment, et celles marquées
  // data-ouvert-mobile (05) sont ouvertes par défaut ; le passage d'un format à l'autre
  // (fenêtre redimensionnée, téléphone tourné) rétablit l'état par défaut du format.
  // Sans JavaScript, tout le contenu reste affiché.
  const mobile = window.matchMedia?.("(max-width: 47.99rem)");
  const estMobile = () => Boolean(mobile?.matches);
  const depliables = [];
  for (const carte of document.querySelectorAll("[data-depliable]")) {
    const bouton = carte.querySelector("[data-depliant]");
    const contenu = document.getElementById(bouton?.getAttribute("aria-controls") ?? "");
    if (!bouton || !contenu) continue;
    const partiel = carte.hasAttribute("data-depliable-partiel");
    const libelle = bouton.querySelector("[data-depliant-libelle]");
    const carteVoisine = carte.closest(".bento")?.querySelector(".carte--pourquoi");
    const regler = (ouvert) => {
      if (ouvert && !estMobile()) for (const autre of depliables) if (autre.carte !== carte && autre.estOuvert()) autre.regler(false);
      if (carteVoisine) carteVoisine.style.minHeight = ouvert && !estMobile() ? `${carteVoisine.getBoundingClientRect().height}px` : "";
      bouton.setAttribute("aria-expanded", String(ouvert));
      carte.toggleAttribute("data-ouvert", ouvert);
      if (partiel) {
        // Fermée : premier onglet ; ouverte : l'onglet indiqué par data-onglet-ouverture.
        const cible = ouvert ? document.getElementById(carte.dataset.ongletOuverture ?? "") : contenu.querySelector(".onglets__panneau");
        if (cible) contenu.activerPanneau?.(cible);
      } else {
        contenu.hidden = !ouvert;
      }
      if (libelle) libelle.textContent = ouvert ? bouton.dataset.libelleFermer : bouton.dataset.libelleOuvrir;
    };
    const estOuvert = () => bouton.getAttribute("aria-expanded") === "true";
    depliables.push({ carte, regler, estOuvert });
    carte.deplier = regler;
    regler(false);
    bouton.addEventListener("click", () => regler(!estOuvert()));
  }
  const etatParDefaut = () => {
    for (const d of depliables) d.regler(false);
    if (estMobile()) for (const d of depliables) if (d.carte.hasAttribute("data-ouvert-mobile")) d.regler(true);
  };
  etatParDefaut();
  mobile?.addEventListener?.("change", etatParDefaut);

  // Infographie « Les trois sphères » : contour irrégulier et lentement mouvant de la
  // sphère d'influence. Animée seulement quand elle est visible à l'écran, jamais si
  // l'utilisateur préfère moins de mouvement.
  for (const figure of document.querySelectorAll("[data-spheres]")) {
    const masque = figure.querySelector("[data-spheres-masque]");
    const contour = figure.querySelector("[data-spheres-contour]");
    const point = figure.querySelector("[data-spheres-point]");
    const fleche = figure.querySelector("[data-spheres-fleche]");
    if (!masque || !contour) continue;
    const cx = 300, cy = 300, base = 182, n = 160;
    const ondes = [
      { k: 2, a: 14, s: 0.11, p: 0.4 },
      { k: 3, a: 11, s: -0.07, p: 1.9 },
      { k: 5, a: 7, s: 0.15, p: 3.1 },
      { k: 7, a: 4, s: -0.2, p: 0.7 },
    ];
    const rayon = (th, t) => ondes.reduce((r, o) => r + o.a * Math.sin(o.k * th + o.p + o.s * t), base);
    const anglePoint = (-15 * Math.PI) / 180; // point de la note, sur la frontière
    const tracer = (t) => {
      let d = "";
      for (let i = 0; i <= n; i++) {
        const th = (i / n) * Math.PI * 2;
        const r = rayon(th, t);
        d += (i ? "L" : "M") + (cx + r * Math.cos(th)).toFixed(1) + " " + (cy + r * Math.sin(th)).toFixed(1);
      }
      d += "Z";
      masque.setAttribute("d", d);
      contour.setAttribute("d", d);
      if (point && fleche) {
        const r = rayon(anglePoint, t);
        const x = (cx + r * Math.cos(anglePoint)).toFixed(1), y = (cy + r * Math.sin(anglePoint)).toFixed(1);
        point.setAttribute("cx", x);
        point.setAttribute("cy", y);
        fleche.setAttribute("d", `M 530 128 Q 522 196 ${x} ${y}`);
      }
    };
    tracer(0);
    const calme = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (calme || typeof IntersectionObserver !== "function") continue;
    let image = 0;
    const t0 = performance.now();
    const boucle = (maintenant) => { tracer((maintenant - t0) / 1000); image = requestAnimationFrame(boucle); };
    new IntersectionObserver(([entree]) => {
      cancelAnimationFrame(image);
      if (entree.isIntersecting) image = requestAnimationFrame(boucle);
    }).observe(figure);
  }

  // Fenêtre « Me contacter » : « Écrire un message » déplie le formulaire.
  for (const lien of document.querySelectorAll("[data-deplier-formulaire]")) {
    const zone = document.getElementById(lien.getAttribute("aria-controls") ?? "");
    if (!zone) continue;
    lien.setAttribute("role", "button");
    lien.addEventListener("click", (evt) => {
      evt.preventDefault();
      const ouvert = lien.getAttribute("aria-expanded") !== "true";
      lien.setAttribute("aria-expanded", String(ouvert));
      zone.hidden = !ouvert;
      if (ouvert) zone.querySelector("input:not([type=hidden]):not([tabindex='-1'])")?.focus();
    });
  }

  // Formulaires de contact (Static Forms) : envoi sans quitter la page.
  // Si l'envoi en arrière-plan échoue côté réseau, envoi classique (page de remerciement).
  for (const form of document.querySelectorAll("[data-formulaire]")) {
    const statut = form.querySelector(".formulaire__statut");
    const bouton = form.querySelector("button[type=submit]");
    const libelle = bouton?.querySelector("[data-libelle]");
    const texteBouton = libelle?.textContent ?? "";
    const afficher = (message, type) => {
      statut.textContent = message;
      statut.dataset.type = type;
      statut.hidden = false;
    };
    form.addEventListener("submit", async (evt) => {
      if (typeof fetch !== "function") return;
      evt.preventDefault();
      bouton.disabled = true;
      if (libelle) libelle.textContent = form.dataset.envoi;
      statut.hidden = true;
      const donnees = Object.fromEntries(new FormData(form));
      delete donnees.redirectTo;
      let reponse;
      try {
        reponse = await fetch(form.action, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(donnees),
        });
      } catch {
        // Réseau ou service refusant l'envoi en arrière-plan : envoi classique.
        form.submit();
        return;
      }
      let ok = reponse.ok;
      try { const json = await reponse.json(); if (json && json.success === false) ok = false; } catch { /* réponse non JSON */ }
      bouton.disabled = false;
      if (libelle) libelle.textContent = texteBouton;
      if (ok) {
        form.reset();
        afficher(form.dataset.succes, "succes");
      } else {
        afficher(form.dataset.erreur, "erreur");
      }
    });
  }

  // Onglets accessibles (motif ARIA « tabs ») : flèches, Début et Fin au clavier.
  for (const bloc of document.querySelectorAll("[data-onglets]")) {
    const liste = bloc.querySelector("[role='tablist']");
    const onglets = [...bloc.querySelectorAll("[role='tab']")];
    const panneaux = onglets.map((o) => document.getElementById(o.getAttribute("aria-controls")));
    if (!liste || onglets.length === 0 || panneaux.includes(null)) continue;

    const activer = (index, focus) => {
      onglets.forEach((onglet, i) => {
        const actif = i === index;
        onglet.setAttribute("aria-selected", String(actif));
        onglet.tabIndex = actif ? 0 : -1;
        // Carte 2 : panneaux superposés, la carte garde la hauteur du plus long.
        // Carte 5 (onglets « libres ») : seul le panneau actif occupe de la place.
        panneaux[i].toggleAttribute("data-actif", actif);
      });
      // La carte connaît son onglet actif (la carte 5 change de largeur selon l'onglet).
      bloc.closest(".carte")?.setAttribute("data-onglet-actif", onglets[index].id.replace(/^onglet-/, ""));
      if (focus) onglets[index].focus();
    };

    onglets.forEach((onglet, i) => {
      onglet.addEventListener("click", () => {
        // Carte 04 (« partielle ») : revenir sur son premier onglet (« Identité »), c'est revenir à la
        // carte fermée : on la replie, et le focus revient sur son bouton d'ouverture.
        if (i === 0 && carteDepliable?.hasAttribute("data-depliable-partiel") && carteDepliable.hasAttribute("data-ouvert")) {
          carteDepliable.deplier?.(false);
          carteDepliable.querySelector("[data-depliant]")?.focus();
          return;
        }
        choisir(i, false);
      });
      onglet.addEventListener("keydown", (evt) => {
        // Navigation parmi les onglets visibles seulement (ex. « Profils » masqué carte ouverte).
        const visibles = onglets.map((o, k) => k).filter((k) => onglets[k].offsetParent !== null);
        const pos = visibles.indexOf(i), der = visibles.length - 1;
        const p = { ArrowRight: pos === der ? 0 : pos + 1, ArrowLeft: pos <= 0 ? der : pos - 1, Home: 0, End: der }[evt.key];
        if (p === undefined || visibles.length === 0) return;
        evt.preventDefault();
        choisir(visibles[p], true);
      });
    });

    // Carte 02 : les onglets restent visibles carte fermée ; en choisir un ouvre la carte.
    const carteDepliable = bloc.closest("[data-depliable]");
    function choisir(i, focus) {
      if (i > 0 && carteDepliable && !carteDepliable.hasAttribute("data-ouvert")) carteDepliable.deplier?.(true);
      activer(i, focus);
    }
    // Si l'onglet actif est masqué (« Profils »), le premier onglet visible reçoit le focus clavier.
    const rendreAtteignable = () => {
      if (onglets.some((o) => o.tabIndex === 0 && o.offsetParent !== null)) return;
      const visible = onglets.find((o) => o.offsetParent !== null);
      if (visible) visible.tabIndex = 0;
    };
    new MutationObserver(rendreAtteignable).observe(bloc, { attributes: true, subtree: true, attributeFilter: ["aria-selected"] });
    bloc.activerPanneau = (panneau) => { const i = panneaux.indexOf(panneau); if (i >= 0) activer(i, false); };
    liste.hidden = false;
    for (const p of panneaux) p.setAttribute("role", "tabpanel");
    activer(0, false);
    rendreAtteignable();
  }

  // Carte retournable (03 : le cadre / le format) : pivote sur un axe vertical.
  // La face cachée est rendue inerte (ni lue ni atteignable au clavier) ; le focus suit le titre
  // de la face visible.
  for (const carte of document.querySelectorAll("[data-retournable]")) {
    const [recto, verso] = carte.querySelectorAll(".cadre__face");
    const regler = (retourne, focus) => {
      carte.toggleAttribute("data-retourne", retourne);
      recto.inert = retourne;
      verso.inert = !retourne;
      const visible = retourne ? verso : recto;
      carte.setAttribute("aria-labelledby", visible.querySelector("h2").id);
      if (focus) visible.querySelector("h2").focus({ preventScroll: true });
    };
    for (const b of carte.querySelectorAll("[data-retourner]")) {
      b.addEventListener("click", () => regler(!carte.hasAttribute("data-retourne"), true));
    }
    regler(false, false);
  }

  // Liens directs (plan du site, ancres) : ouvre le bloc dépliable et l'onglet visés.
  const suivreAncre = () => {
    const cible = location.hash.length > 1 ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
    if (!cible) return;
    const carte = cible.closest("[data-depliable]");
    const bouton = carte?.querySelector("[data-depliant]");
    const panneau = cible.closest(".onglets__panneau");
    // Carte « partielle » (02, 04) : elle ne s'ouvre que pour un panneau caché quand elle est
    // fermée (pas pour la carte elle-même, son titre ou son premier panneau).
    // Autre carte (05) : elle s'ouvre pour tout lien qui la vise.
    const partielle = carte?.hasAttribute("data-depliable-partiel");
    const premier = panneau && panneau === carte?.querySelector(".onglets__panneau");
    const ouvrir = partielle ? Boolean(panneau) && !premier : Boolean(carte);
    if (bouton && ouvrir && bouton.getAttribute("aria-expanded") !== "true") bouton.click();
    panneau?.closest("[data-onglets]")?.activerPanneau?.(panneau);
    (cible.closest(".carte") ?? cible).scrollIntoView({ block: "start" }); // le titre de la carte reste visible
  };
  window.addEventListener("hashchange", suivreAncre);
  suivreAncre();
})();

/** Match every detail card to the Platforms card height (including rows above/below). */
window.prbeatsSyncDetailCardHeights = function (container, platformsCard) {
  if (!container || !platformsCard) return 0;

  const cards = [...container.querySelectorAll(".detail-card")].filter(
    (card) => !card.hidden
  );
  cards.forEach((card) => {
    card.style.minHeight = "";
    card.style.height = "";
  });
  container.style.removeProperty("--detail-card-min-height");

  // Beside the cover, cards are sized by cover height (CSS) — do not equalize.
  if (container.closest(".carousel-hero")) return 0;

  // Force layout, then measure Platforms at its natural content height.
  void platformsCard.offsetHeight;
  const height = Math.ceil(platformsCard.getBoundingClientRect().height);
  if (height <= 0) return 0;

  const px = `${height}px`;
  container.style.setProperty("--detail-card-min-height", px);
  cards.forEach((card) => {
    card.style.minHeight = px;
  });
  return height;
};

window.prbeatsWatchDetailCardHeights = function (container, platformsCard) {
  if (!container || !platformsCard) return;

  const run = () => window.prbeatsSyncDetailCardHeights(container, platformsCard);
  run();
  requestAnimationFrame(() => {
    run();
    requestAnimationFrame(run);
  });

  window._prbeatsDetailCardsContainer = container;
  window._prbeatsDetailCardsPlatforms = platformsCard;

  if (platformsCard._prbeatsResizeObserver) {
    platformsCard._prbeatsResizeObserver.disconnect();
  }
  if (typeof ResizeObserver === "function") {
    let ticking = false;
    platformsCard._prbeatsResizeObserver = new ResizeObserver(() => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const obs = platformsCard._prbeatsResizeObserver;
        obs?.disconnect();
        run();
        obs?.observe(platformsCard);
      });
    });
    platformsCard._prbeatsResizeObserver.observe(platformsCard);
  }

  if (!window._prbeatsDetailCardsResizeBound) {
    window._prbeatsDetailCardsResizeBound = true;
    window.addEventListener("resize", () => {
      const c = window._prbeatsDetailCardsContainer;
      const p = window._prbeatsDetailCardsPlatforms;
      if (c && p) window.prbeatsSyncDetailCardHeights(c, p);
    });
  }
};

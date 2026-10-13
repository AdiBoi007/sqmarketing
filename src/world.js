const QUESTS = [
  {
    title: "COFFEE RUN",
    note: "Meet someone new. Coffee is a decent introduction.",
    location: "EASTERN AVENUE",
    x: 83,
    y: 44,
    region: "eastern",
  },
  {
    title: "ONE MORE?",
    note: "An hour between classes? Find a game and people to play with.",
    location: "SPORTS COURTS",
    x: 71,
    y: 64,
  },
  {
    title: "FOLLOW THE SOUND",
    note: "Find a music session. Join in, or stay and listen.",
    location: "THE QUAD",
    x: 51,
    y: 42,
    region: "quad",
  },
  {
    title: "FISHER. UNFORTUNATELY.",
    note: "Find a study session and some company. The assignment still exists.",
    location: "FISHER LIBRARY",
    x: 82,
    y: 86,
    region: "fisher",
  },
  {
    title: "RELIC HUNT",
    note: "A new route. A hidden relic. Another discovery for your Atlas.",
    location: "THE QUAD",
    x: 29,
    y: 32,
    region: "quad",
  },
  {
    title: "SOCIETY SIDE QUEST",
    note: "The event, the time, the place. Turn up and collect XP.",
    location: "MANNING",
    x: 27,
    y: 68,
    region: "manning",
  },
];

const REGIONS = {
  quad: {
    title: "THE QUAD",
    x: 51,
    y: 42,
    note: "Take the long way past the sandstone. Find a quest, a new face or a landmark for your Atlas.",
    image: "quad-landmark.webp",
    alt: "The sandstone Quad towers over jacarandas in the Side Quest campus.",
    width: 272,
    height: 362,
    object: "collectible-landmark.webp",
    objectWidth: 88,
    objectHeight: 114,
    objectAlt: "An illustrated campus landmark collectible.",
    index: "01 / CAMPERDOWN",
  },
  fisher: {
    title: "FISHER LIBRARY",
    x: 82,
    y: 86,
    note: "Study sessions, nearby people and a reason to leave the same desk for once.",
    image: "region-fisher.webp",
    alt: "Fisher Library reimagined as a colourful illustrated campus region.",
    width: 511,
    height: 259,
    object: "object-notebook.webp",
    objectWidth: 44,
    objectHeight: 39,
    objectAlt: "An illustrated notebook collectible.",
    index: "02 / CAMPERDOWN",
  },
  engineering: {
    title: "ENGINEERING",
    x: 24,
    y: 12,
    note: "Cross into Darlington. Discover new landmarks and campus relics.",
    image: "region-engineering.webp",
    alt: "Buildings and winding paths in the illustrated Side Quest engineering region.",
    width: 450,
    height: 350,
    object: "collectible-gem.webp",
    objectWidth: 84,
    objectHeight: 73,
    objectAlt: "An illustrated gem collectible.",
    index: "03 / DARLINGTON",
  },
  eastern: {
    title: "EASTERN AVENUE",
    x: 75,
    y: 38,
    note: "Coffee, people nearby and society events along your daily route.",
    image: "region-jacarandas.webp",
    alt: "Jacarandas and familiar campus paths in the illustrated Side Quest world.",
    width: 580,
    height: 390,
    object: "collectible-coffee-cup.webp",
    objectWidth: 58,
    objectHeight: 69,
    objectAlt: "An illustrated takeaway coffee collectible.",
    index: "04 / CAMPERDOWN",
  },
  manning: {
    title: "MANNING",
    x: 29,
    y: 66,
    note: "Club nights, society meetups and people you’re going to know.",
    image: "region-cafe.webp",
    alt: "A lively café and gathering place in the illustrated Side Quest campus world.",
    width: 450,
    height: 350,
    object: "collectible-friends.webp",
    objectWidth: 85,
    objectHeight: 67,
    objectAlt: "An illustrated group of friends collectible.",
    index: "05 / CAMPERDOWN",
  },
  law: {
    title: "LAW LAWNS",
    x: 68,
    y: 57,
    note: "A pick-up game, a photo walk or lunch with someone new. Find a reason to stay.",
    image: "region-lawns.webp",
    alt: "Green lawns, landmarks and people in the illustrated Side Quest campus world.",
    width: 490,
    height: 350,
    object: "collectible-map.webp",
    objectWidth: 89,
    objectHeight: 88,
    objectAlt: "An illustrated folded campus map collectible.",
    index: "06 / CAMPERDOWN",
  },
};

const MIN_ZOOM = 0.7;
const MAX_ZOOM = 1.65;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const ease = (value) => 1 - (1 - value) ** 3;
const mix = (start, end, progress) => start + (end - start) * progress;

/** A session-only illustrated campus. Discoveries count actual map interactions. */
export function initWorld({ onQuestSelect } = {}) {
  const $ = (selector) => document.querySelector(selector);
  const viewport = $("#world-viewport");
  const plane = $("#world-plane");
  if (!viewport || !plane) return { selectQuest() {}, destroy() {} };

  const pins = [...document.querySelectorAll(".world-pin[data-world-quest]")];
  const regionButtons = [...document.querySelectorAll("[data-map-region]")];
  const player = $("#world-player");
  const route = $("#world-route");
  const routePath = $("#world-route-path");
  const routeShadow = $("#world-route-shadow");
  const routePaths = [routePath, routeShadow].filter(Boolean);
  const zoomIn = $("#map-zoom-in");
  const zoomOut = $("#map-zoom-out");
  const reset = $("#map-reset");
  const detour = $("#map-detour");
  const secret = $("#world-secret");
  const secretMessage = $("#world-secret-message");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const events = new AbortController();
  const visited = new Set();

  let selectedIndex = 0;
  let point = { x: 50, y: 75 };
  let pan = { x: 0, y: 0 };
  let zoom = 1;
  let fit = 1;
  let dimensions = {
    width: 1000,
    height: 836,
    viewportWidth: 1000,
    viewportHeight: 836,
  };
  let focusPoint = null;
  let cameraMotion = null;
  let playerMotion = null;
  let pendingPan = null;
  let frame = 0;
  let dragging = null;
  let suppressClickUntil = 0;
  let secretCollected = false;
  let destroyed = false;
  let initialCamera = true;
  let fieldRegionKey = null;
  let fieldArtAnimation = null;

  const listen = (target, name, listener, options = {}) =>
    target?.addEventListener(name, listener, {
      ...options,
      signal: events.signal,
    });
  const write = (selector, value) => {
    const element = $(selector);
    if (element) element.textContent = value;
  };

  function constrainPan(next, atZoom = zoom) {
    const scale = fit * atZoom;
    const maxX =
      Math.abs(dimensions.width * scale - dimensions.viewportWidth) / 2;
    const maxY =
      Math.abs(dimensions.height * scale - dimensions.viewportHeight) / 2;
    return { x: clamp(next.x, -maxX, maxX), y: clamp(next.y, -maxY, maxY) };
  }

  function panFor(target, atZoom = zoom) {
    return constrainPan(
      {
        x: (0.5 - target.x / 100) * dimensions.width * fit * atZoom,
        y: (0.5 - target.y / 100) * dimensions.height * fit * atZoom,
      },
      atZoom,
    );
  }

  function paintCamera(nextPan, nextZoom = zoom) {
    zoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
    pan = constrainPan(nextPan, zoom);
    const scale = fit * zoom;
    plane.style.setProperty("--pan-x", `${pan.x.toFixed(2)}px`);
    plane.style.setProperty("--pan-y", `${pan.y.toFixed(2)}px`);
    plane.style.setProperty("--map-scale", String(scale));
    plane.style.setProperty("--pin-scale", String(1 / scale));
    plane.dataset.zoom = zoom.toFixed(2);
    // Focused pins must move the camera, never the hidden-overflow scroll offset.
    if (viewport.scrollLeft) viewport.scrollLeft = 0;
    if (viewport.scrollTop) viewport.scrollTop = 0;
    if (zoomIn) zoomIn.disabled = zoom >= MAX_ZOOM - 0.001;
    if (zoomOut) zoomOut.disabled = zoom <= MIN_ZOOM + 0.001;
  }

  function paintPlayer(next) {
    point = next;
    plane.style.setProperty("--player-x", `${next.x}%`);
    plane.style.setProperty("--player-y", `${next.y}%`);
  }

  function schedule() {
    if (!frame && !destroyed) frame = requestAnimationFrame(tick);
  }

  function tick(now) {
    frame = 0;
    if (destroyed) return;
    if (pendingPan) {
      paintCamera(pendingPan);
      pendingPan = null;
    }
    if (cameraMotion) {
      const state = cameraMotion;
      const progress = clamp((now - state.start) / state.duration, 0, 1);
      const eased = ease(progress);
      paintCamera(
        {
          x: mix(state.from.x, state.to.x, eased),
          y: mix(state.from.y, state.to.y, eased),
        },
        mix(state.fromZoom, state.toZoom, eased),
      );
      if (progress === 1) cameraMotion = null;
    }
    if (playerMotion) {
      const state = playerMotion;
      const progress = clamp((now - state.start) / state.duration, 0, 1);
      const travelled = progress * state.length;
      if (routePath && state.length) {
        const position = routePath.getPointAtLength(travelled);
        paintPlayer({
          x: (position.x / state.width) * 100,
          y: (position.y / state.height) * 100,
        });
        routePaths.forEach((path) => {
          path.style.strokeDashoffset = String(state.length - travelled);
        });
      } else {
        paintPlayer({
          x: mix(state.from.x, state.to.x, progress),
          y: mix(state.from.y, state.to.y, progress),
        });
      }
      if (progress === 1) {
        paintPlayer(state.to);
        playerMotion = null;
        player?.classList.remove("is-moving");
      }
    }
    if (cameraMotion || playerMotion || pendingPan) schedule();
  }

  function focusAt(target, atZoom = 1.3, duration = 360) {
    focusPoint = target;
    const nextZoom = clamp(atZoom, MIN_ZOOM, MAX_ZOOM);
    const nextPan = panFor(target, nextZoom);
    if (reducedMotion.matches || duration === 0) {
      cameraMotion = null;
      paintCamera(nextPan, nextZoom);
      return;
    }
    cameraMotion = {
      from: { ...pan },
      to: nextPan,
      fromZoom: zoom,
      toZoom: nextZoom,
      start: performance.now(),
      duration,
    };
    schedule();
  }

  function drawRoute(target) {
    const width = route?.viewBox.baseVal.width || 1000;
    const height = route?.viewBox.baseVal.height || 836;
    const from = { x: (point.x * width) / 100, y: (point.y * height) / 100 };
    const to = { x: (target.x * width) / 100, y: (target.y * height) / 100 };
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const bend = Math.min(70, Math.hypot(dx, dy) * 0.15);
    const distance = Math.hypot(dx, dy) || 1;
    const offset = { x: (-dy / distance) * bend, y: (dx / distance) * bend };
    let length = 0;
    if (routePath) {
      const pathData = `M${from.x} ${from.y} C${from.x + dx / 3 + offset.x} ${from.y + dy / 3 + offset.y},${from.x + (dx * 2) / 3 + offset.x} ${from.y + (dy * 2) / 3 + offset.y},${to.x} ${to.y}`;
      routePaths.forEach((path) => {
        path.setAttribute("d", pathData);
      });
      try {
        length = routePath.getTotalLength();
      } catch {
        /* Straight movement remains available without SVG geometry. */
      }
      routePaths.forEach((path) => {
        path.style.strokeDasharray = String(length);
        path.style.strokeDashoffset = String(length);
      });
    }
    return { length, width, height, distance };
  }

  function moveTo(target) {
    playerMotion = null;
    const geometry = drawRoute(target);
    player?.classList.toggle("facing-left", target.x < point.x);
    if (reducedMotion.matches) {
      paintPlayer(target);
      routePaths.forEach((path) => {
        path.style.strokeDashoffset = "0";
      });
      player?.classList.remove("is-moving");
      return;
    }
    playerMotion = {
      ...geometry,
      from: { ...point },
      to: { x: target.x, y: target.y },
      start: performance.now(),
      duration: 900 + Math.min(500, geometry.distance * 0.9),
    };
    player?.classList.add("is-moving");
    schedule();
  }

  function finishMotion() {
    if (pendingPan) {
      paintCamera(pendingPan);
      pendingPan = null;
    }
    if (playerMotion) {
      paintPlayer(playerMotion.to);
      playerMotion = null;
      routePaths.forEach((path) => {
        path.style.strokeDashoffset = "0";
      });
    }
    if (cameraMotion) {
      paintCamera(cameraMotion.to, cameraMotion.toZoom);
      cameraMotion = null;
    }
    player?.classList.remove("is-moving");
    cancelAnimationFrame(frame);
    frame = 0;
  }

  function updateFound() {
    write("#world-found", `${visited.size} / ${QUESTS.length} QUESTS FOUND`);
    if (detour) {
      detour.disabled = visited.size === QUESTS.length;
      if (detour.disabled)
        detour.title = "You found all six quests on this map.";
    }
  }

  function updateMapRegion(title) {
    if (title) write("#world-region-title", title);
  }

  function updateFieldRegion(key, { reveal = false } = {}) {
    const region = REGIONS[key];
    if (!region) return;
    const changed = fieldRegionKey !== key;
    fieldRegionKey = key;
    regionButtons.forEach((button) => {
      const selected = button.dataset.mapRegion === key;
      button.setAttribute("aria-pressed", String(selected));
      button.classList.toggle("is-active", selected);
    });
    write("#field-region-title", region.title);
    write("#field-region-note", region.note);
    write("#field-region-caption", region.index);
    const profile = $(".region-profile");
    if (profile) profile.dataset.region = key;
    profile?.style.setProperty("--field-image-width", `${region.width}px`);
    profile?.style.setProperty("--field-image-height", `${region.height}px`);
    const artwork = $("#field-region-image");
    if (artwork) {
      artwork.width = region.width;
      artwork.height = region.height;
      artwork.alt = region.alt;
      artwork.draggable = false;
      const source = `/assets/${region.image}`;
      if (artwork.getAttribute("src") !== source) artwork.src = source;
      fieldArtAnimation?.cancel();
      fieldArtAnimation = null;
      if (
        reveal &&
        changed &&
        !reducedMotion.matches &&
        typeof artwork.animate === "function"
      ) {
        const animation = artwork.animate([{ opacity: 0.82 }, { opacity: 1 }], {
          duration: 220,
          easing: "ease-out",
        });
        fieldArtAnimation = animation;
        animation.onfinish = () => {
          if (fieldArtAnimation === animation) fieldArtAnimation = null;
        };
      }
    }
    const object = $("#field-region-object");
    if (object) {
      object.width = region.objectWidth;
      object.height = region.objectHeight;
      object.alt = region.objectAlt;
      object.draggable = false;
      const source = `/assets/${region.object}`;
      if (object.getAttribute("src") !== source) object.src = source;
    }
  }

  function select(
    index,
    { announce = true, move = true } = {},
    notify = false,
  ) {
    if (!Number.isInteger(index) || !QUESTS[index] || destroyed) return;
    selectedIndex = index;
    const quest = QUESTS[index];
    write("#world-active-title", quest.title);
    write("#world-active-note", quest.note);
    write("#world-active-location", quest.location);
    pins.forEach((pin) => {
      const active = Number(pin.dataset.worldQuest) === index;
      pin.setAttribute("aria-pressed", String(active));
      pin.classList.toggle("is-active", active);
    });
    updateMapRegion(quest.location);
    if (announce) {
      visited.add(index);
      pins
        .find((pin) => Number(pin.dataset.worldQuest) === index)
        ?.classList.add("is-found");
      updateFound();
      write(
        "#world-status",
        `${quest.title}. ${quest.note} ${quest.location}.`,
      );
    }
    if (move) {
      moveTo(quest);
      focusAt(quest);
    }
    if (notify && typeof onQuestSelect === "function") onQuestSelect(index);
  }

  pins.forEach((pin) => {
    const index = Number(pin.dataset.worldQuest);
    const quest = QUESTS[index];
    if (!quest) return;
    pin.style.left = `${quest.x}%`;
    pin.style.top = `${quest.y}%`;
    listen(pin, "click", () => select(index, {}, true));
    listen(pin, "focus", () => focusAt(quest, Math.max(zoom, 1.3)));
  });

  regionButtons.forEach((button) =>
    listen(button, "click", () => {
      const key = button.dataset.mapRegion;
      const region = REGIONS[key];
      if (!region) return;
      updateMapRegion(region.title);
      updateFieldRegion(key, { reveal: true });
      focusAt(region);
      write("#world-status", `${region.title}. ${region.note}`);
    }),
  );

  listen($("#world-open-quest"), "click", () => {
    if (typeof onQuestSelect === "function") onQuestSelect(selectedIndex);
  });
  listen(detour, "click", () => {
    const unexplored = QUESTS.map((_, index) => index).filter(
      (index) => !visited.has(index),
    );
    if (unexplored.length)
      select(
        unexplored[Math.floor(Math.random() * unexplored.length)],
        {},
        true,
      );
  });

  function changeZoom(change) {
    const next = clamp(
      (cameraMotion?.toZoom ?? zoom) + change,
      MIN_ZOOM,
      MAX_ZOOM,
    );
    if (focusPoint) focusAt(focusPoint, next, 240);
    else {
      const ratio = next / zoom;
      cameraMotion = null;
      paintCamera({ x: pan.x * ratio, y: pan.y * ratio }, next);
    }
  }
  listen(zoomIn, "click", () => changeZoom(0.2));
  listen(zoomOut, "click", () => changeZoom(-0.2));
  listen(reset, "click", () => {
    finishMotion();
    focusPoint = null;
    paintCamera({ x: 0, y: 0 }, 1);
    updateMapRegion("THE CAMPUS / WORLD PREVIEW");
    write("#world-status", "Full illustrated campus view.");
  });

  if (secret) {
    secret.style.left = "12%";
    secret.style.top = "77%";
    if (secretMessage) secret.setAttribute("aria-controls", secretMessage.id);
    listen(secret, "focus", () =>
      focusAt({ x: 12, y: 77 }, Math.max(zoom, 1.3)),
    );
    listen(secret, "click", () => {
      const firstFind = !secretCollected;
      secretCollected = true;
      secret.classList.add("is-collected");
      secret.setAttribute("aria-pressed", String(secretCollected));
      if (secretMessage) {
        const open = firstFind || secretMessage.hidden;
        secretMessage.textContent =
          "HIDDEN QUEST FOUND / Take a different way back.";
        secretMessage.hidden = !open;
        secret.setAttribute("aria-expanded", String(open));
      }
      write("#world-status", "Hidden quest found. Take a different way back.");
    });
  }

  listen(viewport, "pointerdown", (event) => {
    if (
      !event.isPrimary ||
      event.button !== 0 ||
      event.target.closest(
        "button, a, input, select, textarea, [contenteditable]",
      )
    )
      return;
    dragging = {
      id: event.pointerId,
      touch: event.pointerType === "touch",
      startX: event.clientX,
      startY: event.clientY,
      pan: { ...pan },
      active: false,
    };
    if (!dragging.touch) {
      event.preventDefault();
      viewport.setPointerCapture(event.pointerId);
    }
  });
  listen(viewport, "pointermove", (event) => {
    if (!dragging || event.pointerId !== dragging.id) return;
    const dx = event.clientX - dragging.startX;
    const dy = event.clientY - dragging.startY;
    if (!dragging.active) {
      if (Math.hypot(dx, dy) < 8) return;
      if (dragging.touch && Math.abs(dy) >= Math.abs(dx) * 0.8) {
        dragging = null;
        return;
      }
      dragging.active = true;
      cameraMotion = null;
      focusPoint = null;
      viewport.classList.add("is-dragging");
      viewport.setPointerCapture(event.pointerId);
    }
    if (event.cancelable) event.preventDefault();
    pendingPan = {
      x: dragging.pan.x + dx,
      y: dragging.pan.y + (dragging.touch ? 0 : dy),
    };
    schedule();
  });
  function endDrag(event) {
    if (!dragging || event.pointerId !== dragging.id) return;
    if (dragging.active) suppressClickUntil = performance.now() + 350;
    if (pendingPan) {
      paintCamera(pendingPan);
      pendingPan = null;
    }
    if (viewport.hasPointerCapture(event.pointerId))
      viewport.releasePointerCapture(event.pointerId);
    dragging = null;
    viewport.classList.remove("is-dragging");
  }
  listen(viewport, "pointerup", endDrag);
  listen(viewport, "pointercancel", endDrag);
  listen(viewport, "lostpointercapture", endDrag);
  listen(
    viewport,
    "click",
    (event) => {
      if (event.detail > 0 && performance.now() < suppressClickUntil) {
        event.preventDefault();
        event.stopImmediatePropagation();
        suppressClickUntil = 0;
      }
    },
    { capture: true },
  );
  listen(viewport, "dragstart", (event) => event.preventDefault());

  function measure() {
    if (destroyed) return;
    finishMotion();
    dimensions = {
      width: plane.offsetWidth || 1000,
      height: plane.offsetHeight || 836,
      viewportWidth: viewport.clientWidth || 1000,
      viewportHeight: viewport.clientHeight || 836,
    };
    fit = Math.min(
      1,
      Math.max(1, dimensions.viewportWidth - 32) / dimensions.width,
      Math.max(1, dimensions.viewportHeight - 32) / dimensions.height,
    );
    if (initialCamera) {
      initialCamera = false;
      if (dimensions.viewportWidth < 600) {
        zoom = 1.45;
        focusPoint = { x: 50, y: 60 };
      }
    }
    paintCamera(focusPoint ? panFor(focusPoint) : { x: 0, y: 0 });
  }
  const resizeObserver =
    "ResizeObserver" in window ? new ResizeObserver(measure) : null;
  if (resizeObserver) {
    resizeObserver.observe(viewport);
    resizeObserver.observe(plane);
  } else listen(window, "resize", measure, { passive: true });
  listen(reducedMotion, "change", (event) => {
    if (event.matches) {
      finishMotion();
      fieldArtAnimation?.cancel();
      fieldArtAnimation = null;
    }
  });

  measure();
  paintPlayer(point);
  updateFound();
  select(0, { announce: false, move: false });
  updateMapRegion("USYD / CAMPERDOWN");
  updateFieldRegion("quad");

  return {
    // A carousel can synchronize the map without echoing its own selection callback.
    selectQuest(index, options) {
      select(index, options, false);
    },
    destroy() {
      destroyed = true;
      events.abort();
      resizeObserver?.disconnect();
      cancelAnimationFrame(frame);
      fieldArtAnimation?.cancel();
      player?.classList.remove("is-moving");
      viewport.classList.remove("is-dragging");
    },
  };
}

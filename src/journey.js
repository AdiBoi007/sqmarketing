const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/** A decorative route through the document; the page keeps its native scroll. */
export function initJourney() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return { destroy() {} };
  }

  const main = document.querySelector("main");
  const svg = document.querySelector("#journey-route");
  const track = document.querySelector("#journey-route-track");
  const progress = document.querySelector("#journey-route-progress");
  const walker = document.querySelector("#journey-walker");
  if (!main || !svg || !track || !progress) return { destroy() {} };

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const events = new AbortController();
  const originalWalkerDisplay = walker?.style.display || "";
  const frontWalkerSrc = walker?.dataset.frontSrc;
  const backWalkerSrc = walker?.dataset.backSrc;
  const anchors = {
    hero: main.querySelector(".hero-bottom"),
    world: main.querySelector(".world-heading"),
    profile: main.querySelector(".region-profile"),
    events: main.querySelector("#events"),
    arc: main.querySelector("#your-story"),
    quests: main.querySelector("#quests"),
    people: main.querySelector(".people-heading"),
    presence: main.querySelector(".presence"),
    poster: main.querySelector(".waitlist-poster"),
    waitlist: main.querySelector(".waitlist-bottom"),
  };

  let geometry = progress;
  let length = 0;
  let firstY = 0;
  let lastY = 1;
  let frame = 0;
  let dirty = true;
  let destroyed = false;
  let mobile = false;
  let lastPaintedY = null;
  let walkingDown = true;

  function listen(target, event, handler, options = {}) {
    target?.addEventListener(event, handler, {
      ...options,
      signal: events.signal,
    });
  }

  function walkerVisible(visible) {
    if (!walker) return;
    walker.hidden = !visible;
    walker.style.display = visible ? originalWalkerDisplay : "none";
  }

  // Offset geometry avoids the temporary transforms used by section reveals.
  function box(element) {
    if (!element || (!element.offsetWidth && !element.offsetHeight))
      return null;
    let current = element;
    let top = 0;
    let left = 0;
    while (current && current !== main) {
      top += current.offsetTop;
      left += current.offsetLeft;
      current = current.offsetParent;
    }
    if (current !== main) {
      const rect = element.getBoundingClientRect();
      const mainRect = main.getBoundingClientRect();
      top = rect.top - mainRect.top;
      left = rect.left - mainRect.left;
    }
    const height = element.offsetHeight;
    return { top, left, height, bottom: top + height };
  }

  function build() {
    dirty = false;
    // A layout change is not a turn in the student's journey.
    lastPaintedY = null;
    const width = main.clientWidth;
    const height = main.offsetHeight;
    if (!width || !height) {
      length = 0;
      walkerVisible(false);
      return;
    }
    mobile = width <= 760;
    const positions = Object.fromEntries(
      Object.entries(anchors).map(([key, element]) => [key, box(element)]),
    );
    const points = [];
    const add = (x, y) => {
      if (!Number.isFinite(y)) return;
      const previous = points.at(-1);
      const nextY = clamp(y, 0, height);
      if (previous && nextY <= previous.y + 1) return;
      points.push({ x: clamp(x, 10, width - 10), y: nextY });
    };

    if (mobile) {
      const right = width - 12;
      const bend = width - 20;
      if (positions.hero) add(right, positions.hero.bottom + 12);
      if (positions.world) add(bend, positions.world.top - 20);
      if (positions.profile) add(right, positions.profile.top - 16);
      if (positions.events) {
        add(bend, positions.events.top + 12);
        add(right, positions.events.bottom - 12);
      }
      if (positions.arc) {
        add(right, positions.arc.top + 12);
        add(bend, positions.arc.bottom - 12);
      }
      if (positions.quests) add(bend, positions.quests.top + 12);
      if (positions.people) add(right, positions.people.top - 20);
      if (positions.presence) add(bend, positions.presence.top + 12);
      if (positions.poster) add(right, positions.poster.top - 20);
      if (positions.waitlist)
        add(
          bend,
          positions.waitlist.top +
            Math.min(180, positions.waitlist.height * 0.3),
        );
    } else {
      if (positions.hero) {
        add(width * 0.38, positions.hero.bottom + 12);
        const heroSection = box(anchors.hero.closest("section"));
        if (heroSection) add(width * 0.036, heroSection.bottom - 12);
      }
      if (positions.world) add(width * 0.06, positions.world.top - 28);
      if (positions.profile) {
        add(width * 0.04, positions.profile.top - 16);
        add(width * 0.04, positions.profile.bottom + 20);
      }
      if (positions.events) {
        add(width * 0.025, positions.events.top + 16);
        add(width * 0.025, positions.events.bottom - 16);
      }
      if (positions.arc) {
        add(width * 0.025, positions.arc.top + 16);
        add(width * 0.025, positions.arc.bottom - 16);
      }
      if (positions.quests) {
        add(width * 0.91, positions.quests.top + 18);
        add(width * 0.975, positions.quests.top + 105);
        add(width * 0.975, positions.quests.bottom - 20);
      }
      if (positions.people) {
        add(width * 0.975, positions.people.top - 25);
        add(width * 0.975, positions.people.top + 28);
        const peopleSection = box(anchors.people.closest("section"));
        if (peopleSection) add(width * 0.975, peopleSection.bottom - 18);
      }
      if (positions.presence) {
        add(width * 0.1, positions.presence.top + 12);
        add(width * 0.026, positions.presence.top + 28);
        add(width * 0.026, positions.presence.bottom + 12);
      }
      if (positions.poster) {
        add(width * 0.06, positions.poster.top - 30);
        add(width * 0.025, positions.poster.top - 5);
        add(width * 0.025, positions.poster.bottom + 15);
      }
      if (positions.waitlist) {
        add(width * 0.48, positions.waitlist.top - 18);
        add(
          width * 0.48,
          positions.waitlist.top +
            Math.min(220, positions.waitlist.height * 0.45),
        );
      }
    }

    if (points.length < 2) {
      add(mobile ? width - 12 : width * 0.04, height * 0.08);
      add(mobile ? width - 12 : width * 0.04, height * 0.92);
    }
    if (points.length < 2) {
      length = 0;
      walkerVisible(false);
      return;
    }
    let path = `M${points[0].x} ${points[0].y}`;
    for (let index = 1; index < points.length; index += 1) {
      const from = points[index - 1];
      const to = points[index];
      const vertical = (to.y - from.y) * 0.45;
      path += ` C${from.x} ${from.y + vertical},${to.x} ${to.y - vertical},${to.x} ${to.y}`;
    }
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("width", String(width));
    svg.setAttribute("height", String(height));
    svg.setAttribute("preserveAspectRatio", "none");
    track.setAttribute("d", path);
    progress.setAttribute("d", path);
    firstY = points[0].y;
    lastY = points.at(-1).y;
    geometry = typeof progress.getTotalLength === "function" ? progress : track;
    try {
      length = geometry.getTotalLength();
    } catch {
      length = 0;
    }
    progress.style.strokeDasharray = length ? String(length) : "none";
    if (walker) walker.style.width = mobile ? "24px" : "28px";
  }

  function paint() {
    if (
      reducedMotion.matches ||
      !length ||
      typeof geometry.getPointAtLength !== "function"
    ) {
      progress.style.strokeDashoffset = "0";
      walkerVisible(false);
      return;
    }
    const readingY =
      window.innerHeight * 0.57 - main.getBoundingClientRect().top;
    const targetY = clamp(readingY, firstY, lastY);
    let travelled;
    if (targetY <= firstY) travelled = 0;
    else if (targetY >= lastY) travelled = length;
    else {
      // Cubic control points keep Y monotonic, so this follows the actual page position.
      let low = 0;
      let high = length;
      for (let index = 0; index < 13; index += 1) {
        const middle = (low + high) / 2;
        if (geometry.getPointAtLength(middle).y < targetY) low = middle;
        else high = middle;
      }
      travelled = (low + high) / 2;
    }
    progress.style.strokeDashoffset = String(length - travelled);
    if (!walker) return;
    const point = geometry.getPointAtLength(travelled);
    if (lastPaintedY !== null && Math.abs(point.y - lastPaintedY) > 0.5) {
      walkingDown = point.y > lastPaintedY;
    }
    lastPaintedY = point.y;
    const source = walkingDown ? frontWalkerSrc : backWalkerSrc;
    if (source && walker.getAttribute("src") !== source) {
      walker.setAttribute("src", source);
    }
    walker.dataset.facing = walkingDown ? "down" : "up";
    const next = geometry.getPointAtLength(Math.min(length, travelled + 5));
    const previous = geometry.getPointAtLength(Math.max(0, travelled - 5));
    const dx = next.x - previous.x;
    const dy = next.y - previous.y;
    const tilt = clamp(
      ((Math.atan2(dx, Math.max(1, dy)) * 180) / Math.PI) * 0.12,
      -7,
      7,
    );
    const facing = dx * (walkingDown ? 1 : -1) < -0.1 ? -1 : 1;
    walker.style.left = `${point.x.toFixed(2)}px`;
    walker.style.top = `${point.y.toFixed(2)}px`;
    walker.style.transformOrigin = "50% 90%";
    walker.style.transform = `translate(-50%, -86%) rotate(${tilt.toFixed(2)}deg) scaleX(${facing})`;
    walkerVisible(true);
  }

  function render() {
    frame = 0;
    if (destroyed) return;
    if (dirty) build();
    paint();
  }
  function schedule(rebuild = false) {
    if (destroyed) return;
    dirty ||= rebuild;
    if (!frame) frame = requestAnimationFrame(render);
  }
  const invalidate = () => schedule(true);

  listen(window, "scroll", () => schedule(), { passive: true });
  listen(window, "resize", invalidate, { passive: true });
  listen(window, "load", invalidate, { once: true });
  listen(reducedMotion, "change", () => schedule());
  const resizeObserver =
    "ResizeObserver" in window ? new ResizeObserver(invalidate) : null;
  if (resizeObserver) {
    resizeObserver.observe(main);
    Object.values(anchors)
      .filter(Boolean)
      .forEach((element) => resizeObserver.observe(element));
  }
  document.fonts?.ready
    .then(() => {
      if (!destroyed) invalidate();
    })
    .catch(() => {});
  schedule(true);

  return {
    destroy() {
      destroyed = true;
      events.abort();
      resizeObserver?.disconnect();
      cancelAnimationFrame(frame);
      frame = 0;
      walkerVisible(false);
    },
  };
}

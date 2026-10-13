const stages = [
  ["CAMPUS", "NPC."],
  ["CAMPUS", "EXPLORER."],
  ["PARTY", "MEMBER."],
  ["SIDE QUEST", "REGULAR."],
  ["CAMPUS", "REGULAR."],
];

const detours = {
  explore: {
    name: "Explore",
    copy: "Discover a new corner of campus. Find a relic for your Atlas.",
  },
  meet: {
    name: "Meet",
    copy: "A shared interest. A reason to say hello. Someone new becomes a familiar face.",
  },
  play: {
    name: "Play",
    copy: "An hour between classes. A game at the courts. Might as well side quest.",
  },
  show: {
    name: "Show up",
    copy: "Find a club or society event. Check in. Earn XP for showing up.",
  },
};

const opening = "Lecture. Home. Repeat. Or take a side quest.";
const complete =
  "New places. New people. Games and society nights. That’s a semester worth showing up for.";

/** A small, explicitly labelled story preview. State lives only in this page. */
export function initCampusArc(scope = globalThis.document) {
  const host = scope?.querySelector?.("[data-campus-arc]");
  if (!host || host.dataset.arcReady === "true") return { destroy() {} };

  const buttons = [...host.querySelectorAll("[data-arc-choice]")].filter(
    (button) => detours[button.dataset.arcChoice],
  );
  const first = host.querySelector("[data-arc-title-first]");
  const second = host.querySelector("[data-arc-title-second]");
  const copy = host.querySelector("[data-arc-copy]");
  const count = host.querySelector("[data-arc-count]");
  const reset = host.querySelector("[data-arc-reset]");
  const live = host.querySelector("[data-arc-live]");
  const track = host.querySelector("[data-arc-track]");
  const avatar = host.querySelector("[data-arc-avatar]");
  const progress = host.querySelector("[data-arc-progress]");
  if (
    buttons.length !== 4 ||
    !first ||
    !second ||
    !copy ||
    !count ||
    !reset ||
    !track ||
    !avatar ||
    !progress
  )
    return { destroy() {} };

  const view = host.ownerDocument.defaultView;
  const narrow = view?.matchMedia("(max-width: 700px)");
  const chosen = new Set();
  let disposed = false;

  function positionAvatar() {
    if (disposed) return;
    const vertical = narrow?.matches;
    const distance = vertical
      ? track.clientHeight - avatar.offsetHeight
      : track.clientWidth - avatar.offsetWidth;
    const travel = Math.max(0, distance) * (chosen.size / buttons.length);
    host.style.setProperty("--arc-travel", `${Math.round(travel)}px`);
  }

  function render(message = "") {
    const total = chosen.size;
    const latest = [...chosen].at(-1);
    first.textContent = stages[total][0];
    second.textContent = stages[total][1];
    copy.textContent =
      total === buttons.length
        ? complete
        : latest
          ? detours[latest].copy
          : opening;
    count.textContent = `${total} / ${buttons.length}`;
    reset.disabled = total === 0;
    host.dataset.arcStage = String(total);
    buttons.forEach((button) => {
      button.setAttribute(
        "aria-pressed",
        String(chosen.has(button.dataset.arcChoice)),
      );
    });
    progress.style.setProperty(
      "--arc-fill",
      `${(total / buttons.length) * 100}%`,
    );
    positionAvatar();
    if (live && message)
      live.textContent = `${message} ${total} of ${buttons.length} detours taken in this story preview. ${stages[total].join(" ")}`;
  }

  function choose(event) {
    const key = event.currentTarget.dataset.arcChoice;
    const removing = chosen.has(key);
    if (removing) chosen.delete(key);
    else chosen.add(key);
    render(`${detours[key].name} ${removing ? "removed" : "completed"}.`);
  }

  function restart() {
    chosen.clear();
    render("Playthrough restarted.");
  }

  buttons.forEach((button) => {
    button.disabled = false;
    button.addEventListener("click", choose);
  });
  reset.addEventListener("click", restart);
  narrow?.addEventListener?.("change", positionAvatar);
  view?.addEventListener("resize", positionAvatar, { passive: true });
  const observer = view?.ResizeObserver
    ? new view.ResizeObserver(positionAvatar)
    : null;
  observer?.observe(track);
  avatar.addEventListener("load", positionAvatar);
  host.dataset.arcReady = "true";
  render();

  return {
    destroy() {
      disposed = true;
      buttons.forEach((button) => button.removeEventListener("click", choose));
      reset.removeEventListener("click", restart);
      narrow?.removeEventListener?.("change", positionAvatar);
      view?.removeEventListener("resize", positionAvatar);
      avatar.removeEventListener("load", positionAvatar);
      observer?.disconnect();
      delete host.dataset.arcReady;
    },
  };
}

import { initWorld } from "./world.js";
import { initWaitlist } from "./waitlist.js";
import { initJourney } from "./journey.js";
import { initCampusArc } from "./campus-arc.js";
const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [
  ...scope.querySelectorAll(selector),
];
const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
const asset = (name) => `/assets/${name}`;
const text = (selector, value) => {
  const node = $(selector);
  if (node) node.textContent = value;
};
const quests = [
  {
    title: "COFFEE\nRUN.",
    category: "MEET SOMEONE NEW",
    place: "EASTERN AVENUE",
    copy: "Meet someone new over coffee. One café. One easy reason to say hello.",
    image: "cafe-gathering.webp",
    width: 475,
    height: 270,
    alt: "Four Side Quest students sharing coffee at a sunny campus café",
    object: "collectible-coffee-cup.webp",
    note: "SMALL QUEST. GOOD COMPANY.",
  },
  {
    title: "ONE\nMORE?",
    category: "AN HOUR BETWEEN CLASSES",
    place: "SPORTS COURTS",
    copy: "An hour free? Find a game at the courts and people to play with. A better way to wait for your next class.",
    image: "world-courts.webp",
    width: 445,
    height: 300,
    alt: "Students playing basketball on the illustrated Side Quest campus courts",
    object: "object-sneakers.webp",
    note: "BEING GOOD IS OPTIONAL.",
  },
  {
    title: "FOLLOW\nTHE SOUND.",
    category: "SOMEONE BROUGHT A GUITAR",
    place: "THE QUAD",
    copy: "Someone brought a guitar to the Quad. Find the session. Join in or stay a while.",
    image: "world-discovery.webp",
    width: 535,
    height: 885,
    alt: "Sandstone and jacarandas surround students in the Side Quest Quad",
    object: "collectible-star.webp",
    note: "THE QUAD BROUGHT THE ACOUSTICS.",
  },
  {
    title: "FISHER.\nUNFORTUNATELY.",
    category: "A STUDY SIDE QUEST",
    place: "FISHER LIBRARY",
    copy: "Find a study session and some company. The assignment still exists.",
    image: "region-fisher.webp",
    width: 511,
    height: 259,
    alt: "An illustrated campus view around Fisher Library",
    object: "object-notebook.webp",
    note: "THE BOOKS ARE STILL REAL.",
  },
  {
    title: "RELIC\nHUNT.",
    category: "EXPLORE + COLLECT",
    place: "THE QUAD",
    copy: "Take a route you haven't tried. Find hidden campus relics and keep them in your Atlas.",
    image: "region-quad.webp",
    width: 560,
    height: 380,
    alt: "A detailed illustrated campus landmark beneath jacaranda trees",
    object: "collectible-gem.webp",
    note: "CAMPUS HAS COLLECTIBLES. WHO KNEW.",
  },
  {
    title: "SOCIETY\nSIDE QUEST.",
    category: "CLUBS + SOCIETY EVENTS",
    place: "MANNING",
    copy: "Find the event, the time and the place. Bring a friend or meet one there. Check in. Collect XP.",
    image: "event-society-fair.webp",
    width: 365,
    height: 152,
    alt: "Students exploring club and society stalls in the illustrated Side Quest campus",
    object: "people-group-cutout.webp",
    objectAlt: "A group of Side Quest students together on campus",
    note: "YOU SAID YOU'D GO. HERE'S THE PLAN.",
  },
];
let questIndex = 0;
let world;
let imageTicket = 0;
let imageTimeout;
const questTabs = $$("#quest-tabs [data-quest]");
const saved = new Set();
try {
  const value = JSON.parse(localStorage.getItem("sq-preview-quests") || "[]");
  if (Array.isArray(value))
    value.forEach((i) => {
      if (Number.isInteger(i) && i >= 0 && i < quests.length) saved.add(i);
    });
} catch {}
function updateSaved() {
  const active = saved.has(questIndex);
  const button = $("#quest-save");
  button.setAttribute("aria-pressed", String(active));
  button.replaceChildren(
    document.createTextNode(
      active ? "SAVED IN YOUR PREVIEW " : "SAVE FOR LATER ",
    ),
  );
  const symbol = document.createElement("span");
  symbol.setAttribute("aria-hidden", "true");
  symbol.textContent = active ? "✓" : "+";
  button.append(symbol);
  text(
    "#quest-saved-count",
    saved.size
      ? `${String(saved.size).padStart(2, "0")} ${saved.size === 1 ? "QUEST" : "QUESTS"} SAVED IN THIS PREVIEW.`
      : "YOUR AFTERNOON IS STILL OPEN.",
  );
}
function selectQuest(index, { announce = true, sync = false } = {}) {
  questIndex = (index + quests.length) % quests.length;
  const quest = quests[questIndex];
  text("#quest-title", quest.title);
  text("#quest-category", quest.category);
  text("#quest-place", quest.place);
  text("#quest-copy", quest.copy);
  text("#quest-number", String(questIndex + 1).padStart(2, "0"));
  text("#quest-art-note", quest.note);
  $("#quest-stage").dataset.quest = String(questIndex);
  questTabs.forEach((button) =>
    button.setAttribute(
      "aria-pressed",
      String(Number(button.dataset.quest) === questIndex),
    ),
  );
  const image = $("#quest-art");
  const frame = image.closest("figure");
  const ticket = ++imageTicket;
  if (image.getAttribute("src") !== asset(quest.image)) {
    if (!motion.matches) frame.classList.add("is-changing");
    clearTimeout(imageTimeout);
    const reveal = () => {
      if (ticket === imageTicket) frame.classList.remove("is-changing");
    };
    image.onload = reveal;
    image.onerror = reveal;
    image.width = quest.width;
    image.height = quest.height;
    image.src = asset(quest.image);
    imageTimeout = window.setTimeout(reveal, 450);
  }
  image.alt = quest.alt;
  const object = $("#quest-object");
  const objectSizes = [
    [58, 69],
    [46, 38],
    [63, 64],
    [44, 39],
    [84, 73],
    [435, 244],
  ];
  [object.width, object.height] = objectSizes[questIndex];
  object.src = asset(quest.object);
  object.alt =
    quest.objectAlt || `A collectible from ${quest.title.replace(/\n/g, " ")}`;
  updateSaved();
  if (announce)
    text(
      "#quest-status",
      `Quest ${questIndex + 1} of ${quests.length}: ${quest.title.replace(/\n/g, " ")} ${quest.copy}`,
    );
  if (sync) world?.selectQuest(questIndex, { announce: false, move: true });
}
questTabs.forEach((button) =>
  button.addEventListener("click", () =>
    selectQuest(Number(button.dataset.quest), { sync: true }),
  ),
);
$("#quest-prev").addEventListener("click", () =>
  selectQuest(questIndex - 1, { sync: true }),
);
$("#quest-next").addEventListener("click", () =>
  selectQuest(questIndex + 1, { sync: true }),
);
$("#quest-tabs").addEventListener("keydown", (event) => {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const focused = event.target.closest("[data-quest]");
  const start = focused ? Number(focused.dataset.quest) : questIndex;
  selectQuest(
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? quests.length - 1
        : start + (event.key === "ArrowRight" ? 1 : -1),
    { sync: true },
  );
  questTabs
    .find((button) => Number(button.dataset.quest) === questIndex)
    ?.focus();
});
$("#quest-save").addEventListener("click", () => {
  if (saved.has(questIndex)) saved.delete(questIndex);
  else saved.add(questIndex);
  try {
    localStorage.setItem("sq-preview-quests", JSON.stringify([...saved]));
  } catch {}
  updateSaved();
  text(
    "#quest-status",
    `${quests[questIndex].title.replace(/\n/g, " ")} ${saved.has(questIndex) ? "saved in this preview" : "removed from your saved preview"}.`,
  );
});
let swipeStart = null;
const swipeTarget = $("#quest-artwork");
swipeTarget.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  swipeStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
});
swipeTarget.addEventListener("pointerup", (event) => {
  if (!swipeStart || swipeStart.id !== event.pointerId) return;
  const dx = event.clientX - swipeStart.x,
    dy = event.clientY - swipeStart.y;
  swipeStart = null;
  if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.6)
    selectQuest(questIndex + (dx < 0 ? 1 : -1), { sync: true });
});
swipeTarget.addEventListener("pointercancel", () => {
  swipeStart = null;
});
selectQuest(0, { announce: false });
world = initWorld({
  onQuestSelect: (index) => selectQuest(index, { announce: false }),
});

const contexts = {
  classes: { label: "ONE SHARED CLASS", reason: "Same Tuesday tutorial." },
  interests: {
    label: "A SHARED INTEREST",
    reason: "You both take coffee quite seriously.",
  },
  societies: {
    label: "THE SAME SOCIETY",
    reason: "You joined the same society.",
  },
  quests: {
    label: "THE SAME SIDE QUEST",
    reason: "You both picked the coffee run.",
  },
  places: {
    label: "A FAMILIAR PLACE",
    reason: "Same route. Different timetables.",
  },
};
let peopleMode = "nearby",
  peopleContext = "interests";
function updatePeople(announce = true) {
  const context = contexts[peopleContext];
  $("#people-scene").dataset.mode = peopleMode;
  text("#people-context-label", context.label);
  text("#people-shared-reason", context.reason);
  text(
    "#people-crossing",
    peopleMode === "crossed"
      ? "A FAMILIAR FACE.\nNOW WITH CONTEXT."
      : "SAME CAMPUS.\nSOMETHING IN COMMON.",
  );
  $$(".people-tab").forEach((button) =>
    button.setAttribute(
      "aria-pressed",
      String(button.id === `people-${peopleMode}`),
    ),
  );
  $$("[data-context]").forEach((button) =>
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.context === peopleContext),
    ),
  );
  if (announce)
    text(
      "#people-status",
      `${peopleMode === "nearby" ? "Nearby people" : "Crossed paths"} preview. ${context.label}. ${context.reason}`,
    );
}
$$(".people-tab").forEach((button) =>
  button.addEventListener("click", () => {
    peopleMode = button.id === "people-crossed" ? "crossed" : "nearby";
    updatePeople();
  }),
);
$$("[data-context]").forEach((button) =>
  button.addEventListener("click", () => {
    peopleContext = button.dataset.context;
    updatePeople();
  }),
);
updatePeople(false);
initWaitlist();
const campusArc = initCampusArc();

// Native scrolling stays native. A single frame updates the reading position.
document.documentElement.classList.add("js-ready");
const revealElements = $$(".reveal");
const observer =
  "IntersectionObserver" in window
    ? new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.06, rootMargin: "0px 0px -20px 0px" },
      )
    : null;
revealElements.forEach((element) => {
  if (motion.matches || !observer) element.classList.add("is-visible");
  else observer.observe(element);
});
const chapters = $$("section[data-chapter]");
let scrollFrame = 0;
function paintScroll() {
  scrollFrame = 0;
  $("#hero-portal").style.setProperty(
    "--hero-depth",
    `${motion.matches ? 0 : Math.min(42, window.scrollY * 0.055)}px`,
  );
  $("#site-header").classList.toggle("scrolled", window.scrollY > 30);
  const total = document.documentElement.scrollHeight - window.innerHeight;
  $("#page-progress").style.transform =
    `scaleX(${total > 0 ? clamp(window.scrollY / total) : 0})`;
  const reading = Math.max(120, Math.min(window.innerHeight * 0.4, 350));
  let active = chapters[0];
  for (const section of chapters) {
    if (section.getBoundingClientRect().top > reading) break;
    active = section;
  }
  $$("#site-header nav a").forEach((link) => {
    if (link.hash === `#${active.id}`)
      link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  });
}
function scheduleScroll() {
  if (!scrollFrame) scrollFrame = requestAnimationFrame(paintScroll);
}
window.addEventListener("scroll", scheduleScroll, { passive: true });
window.addEventListener("resize", scheduleScroll, { passive: true });
paintScroll();
const portal = $("#hero-portal");
portal.addEventListener("pointermove", (event) => {
  if (motion.matches || event.pointerType === "touch") return;
  const rect = portal.getBoundingClientRect();
  portal.style.setProperty(
    "--hero-x",
    `${clamp((event.clientX - rect.left) / rect.width) * 10 - 5}px`,
  );
  portal.style.setProperty(
    "--hero-y",
    `${clamp((event.clientY - rect.top) / rect.height) * 10 - 5}px`,
  );
});
portal.addEventListener("pointerleave", () => {
  portal.style.setProperty("--hero-x", "0px");
  portal.style.setProperty("--hero-y", "0px");
});
$$("[data-enter-quest]").forEach((link) => {
  link.addEventListener("click", () =>
    selectQuest(Number(link.dataset.enterQuest), { sync: true }),
  );
});
const journey = initJourney();
window.addEventListener("pagehide", (event) => {
  if (!event.persisted) {
    journey.destroy();
    campusArc.destroy();
  }
});
motion.addEventListener("change", (event) => {
  if (event.matches)
    revealElements.forEach((element) => element.classList.add("is-visible"));
  scheduleScroll();
});

# SIDE QUEST / A world, with a door

## Research

The first build studied [Webstell's project archive](https://webstell-studio.com/projects). The archive supplies static concept previews; individual project routes returned 404. Matter leads the art direction: extreme scale, physical objects, intentional imbalance and an authored stage. Nomia and Alpine inform geography; Noctra informs curiosity; GEN-Z informs confidence. These influences are not averaged into a new game aesthetic, and no reference assets or code are used.

The refinement benchmarked primary pages and shipped source from [Lusion](https://lusion.co/), [Of the Oak](https://oftheoak.co.uk/), [Bruno Simon](https://bruno-simon.com/), [Locomotive](https://locomotive.ca/en), [Active Theory](https://activetheory.net/) and [Moooi](https://www.moooi.com/en). Lusion's live opening was visually inspected: quiet navigation and one dominant interactive artwork. The other motion findings are source-based rather than claims of visually verified transitions. Useful principles: exploration teaches the premise, interaction remains optional, one image carries one thought, and motion reveals state rather than replacing native scrolling.

## Direction

An editorial campaign with an illustrated campus underneath. Parchment, near-black grotesk, precise small annotations. The original Side Quest artwork owns the colour. The website owns the composition.

The architecture puts the practical promise inside the open-world story: explore campus, meet people, and find club and society events in one dedicated university platform. After the opening come the campus, events, a playable campus arc, between-class quests, people and the invitation. Copy is brief; detail appears when explored. This is an editorial choice, not a claim that lower word count automatically improves search ranking.

- A monumental opening poster: UNIVERSITY / NEEDS MORE / SIDE QUESTS. A broad original campus scene interrupts the printed grid. Its edge is deliberately broken; a faithfully masked walking student crosses the letters and the official flag escapes the image. There is no repeated arch motif or marquee.
- One explorable campus: bounded drag and zoom, six reachable quest markers, a character walking the selected route, six region viewpoints, an unvisited detour and one hidden compass. Counters reflect actual preview interactions, never fabricated live activity.
- An open Atlas spread beneath the region controls: each place reveals its own original campus crop, collectible and brief field note. The selected field note remains stable when a quest changes the map camera. A short artwork reveal respects reduced motion and cancels safely on rapid selections.
- One quest log: club and society events get a dedicated green-paper spread, original society-fair scenery and three native event disclosures. Time, place and the plan stay together. The schedule is explicitly an example, rather than fabricated live events. Showing up earns XP.
- A possible campus arc: an interactive NPC-to-campus-regular story with Explore, Meet, Play and Show Up detours. The original character advances along a horizontal desktop route or vertical touch route. Ranks illustrate a possible story, not fixed product rules. NPC and a small LARP aside provide sparse, explicit meme references in the user's corrected tone.
- A quest collection: one story and one artwork at a time on a dark editorial stage, with a different spatial arrangement for each quest. Sharp image crops, restrained source-size caps, touch swipes, keyboard controls and saved preview quests. Sports copy follows the basketball artwork rather than suggesting a literal tennis scene.
- Familiar strangers: intersecting paths, original portrait artwork, Nearby People / Crossed Paths and one short shared context. The quiet parchment scene gives the dark quest collection room to breathe.
- USYD: the whole illustrated campus beneath huge type, original students crossing its edge and a real inline waitlist, reached directly from the header and hero.
- A compact “Before you go” epilogue: six native, keyboard-friendly disclosures explain the open world, club and society events, XP/relics, creating a quest, meeting people and launch. USYD launches first; other universities are coming soon. More detail is available on demand; the main story keeps its visual pace.

Desktop composes across a broad grid. Mobile gives the campus scene its own vertical space, a closer map view with finger-sized markers, independent quest crops and a stacked form. Exact artwork proportions and restrained maximum display widths prevent unnecessary enlargement. The interactive map's embedded slang heading is covered with a small editorial annotation; the illustration itself remains unchanged.

## Interaction and implementation

Retain the existing vanilla HTML/CSS/JS and Vite stack. World, story and waitlist modules are separate; no heavy animation framework or 3D dependency. Scroll updates are frame-throttled; the map only runs frames during movement. Native page scrolling remains available over touch maps. All pins, regions and stories have ordinary keyboard controls. Announcements come from the interaction's origin, without competing live regions. Reduced motion stops decorative effects and resolves camera/player movement instantly.

One continuous route connects the campaign, campus, events, campus arc, quests, people and invitation. A tiny character follows its actual document position as the reader scrolls. It runs only on scroll and geometry changes, without an animation loop. Mobile keeps this route in the gutter. Reduced motion shows the route without the moving character. The opening scene adds a restrained scroll depth and pointer response; neither changes layout or captures scrolling.

Branding faithfully uses the user's original Unknown-6 logo sheet. World and character assets are cropped or alpha-masked from the supplied originals. New Unknown-7 through Unknown-14 derivatives add a fresh campus perspective, a larger café gathering, a group cutout and collectibles. At the user's request, a matching front-facing variant of the small route walker was made with built-in imagegen; it faces down during downward scrolling and returns to the original back view during upward scrolling. See ASSET-SOURCES.md for provenance. All other supplied artwork remains original.

The waitlist only reports success after server acceptance. Local development stores JSONL; Vercel stores deduplicated records in the existing private Sydney Blob store. Names, normalized emails and campus are kept on the server. There are no public signup feeds or fabricated waitlist counts. Email delivery is a separate launch workflow.

# SIDE QUEST

An interactive editorial campaign for campus life as an open world: explore, meet people, and find club and society events in one dedicated university platform. Built with vanilla HTML, CSS and JavaScript, with original Side Quest illustrations and a real USYD beta waitlist. Vite handles development and the production build; a small Node server handles beta signups.

## Run

Requires Node 22.12+.

```sh
npm install
npm run dev
```

Open http://127.0.0.1:5173.

## Production

```sh
npm run check
npm run build
npm start
```

Open http://127.0.0.1:4173. `HOST` and `PORT` can be configured by the host.

The production server serves `dist/` and `/api/beta` together. Signups persist to `data/beta-signups.jsonl`, which is excluded from Git. Set `BETA_DATA_DIR` to a durable, private directory on your host. No email is sent automatically; the saved list is ready to connect to your launch mailing workflow. Static-only hosting needs a separate signup endpoint.

Optional build-time settings:

- `VITE_BETA_URL`: use an existing external signup form instead of the inline form.
- `VITE_BETA_ENDPOINT`: POST the waitlist to an external endpoint returning `{ "ok": true }` on acceptance.

## Vercel

Live site: https://side-quest-sigma-liard.vercel.app

The project is linked to `side-quest` in the existing Vercel account. Deploy with:

```sh
vercel --prod
```

Vercel builds the static website and runs `api/beta.js` as a Node function in Sydney. Beta signups are stored in the connected **private** `side-quest-beta` Blob store. Its `BLOB_READ_WRITE_TOKEN` is configured in Vercel's Production and Preview environments and stays on the server. Each normalized email has one private JSON record, so duplicate submissions do not overwrite an existing signup.

The local Node server continues to save JSONL files. Vercel uses durable Blob storage and returns an error if storage is unavailable. Signup emails are not sent automatically.

Download or export saved records through the Vercel project's Storage dashboard using the account's authenticated access. The `beta-signups/` prefix contains the signup records.

The API validates input, deduplicates email addresses, limits request sizes and submission rates, and uses a honeypot. Names and email addresses are never written to application logs.

## Files

- `index.html`: semantic page architecture, shared SVG icon family, inline waitlist.
- `src/styles.css`: typography, editorial layouts, responsive art direction and reduced motion.
- `src/campaign.css`: the campus poster, continuous route, Atlas spread and USYD finale.
- `src/chapter-art.css`: the dark quest exhibition and parchment people composition.
- `src/positioning.css`: the club/society quest log, revised copy hierarchy and mobile refinements.
- `src/campus-arc.js` and `src/campus-arc.css`: the interactive NPC-to-campus-regular story.
- `src/main.js`: quest stories, saved preview quests, shared people contexts and the reading position.
- `src/journey.js`: the scroll-following route and character, with bounded frame updates.
- `src/world.js`: bounded camera, drag/zoom, character routes, discoveries and regions.
- `src/waitlist.js`: accessible validation and server-confirmed signup.
- `server/beta.mjs`: shared signup handler for development and production.
- `docs/DESIGN.md`: reference analysis and design direction.
- `ASSET-SOURCES.md`: provenance and crop details for original Side Quest artwork.

World imagery and activities are illustrative previews, not a live campus feed. No Webstell artwork or implementation is included.

## Validation

The rebuilt page was visually reviewed in Chrome at 1920 × 1080, 1440 × 900, 820 × 1180 and 393 × 852. The campaign refinement replaced repeated arches and frames with a broad campus poster, an original student crossing the typography, a dark quest exhibition and a whole-campus USYD finale. It improved character scale, mobile discovery-link placement, long-title sizing and Safari button rendering. All six quest states fit the tablet and iPhone layouts without horizontal overflow or clipped headings. Pins synchronize the quest stories; the character travels to selected discoveries. Keyboard quest controls, people contexts, saved quests and the inline form were exercised. A synthetic browser signup persisted and its test record was removed during the signup implementation.

`npm run check` verifies the page structure, navigation, local references and signup contract. The signup API was also checked for invalid input, duplicate and concurrent submissions, restart persistence, rate limiting, bot handling and storage failures using temporary data.

The positioning refinement was reviewed at the same four viewport sizes. The event disclosures, event-to-quest link, relic hunt, layered society artwork and launch FAQ were exercised. All campus-arc stages fit desktop and mobile; keyboard selection, removing a detour and resetting the playthrough were verified. Mobile hero spacing now keeps the beta action inside the 393 × 852 opening view. The revised People heading, event disclosures and page route retain responsive geometry without horizontal overflow. Reduced-motion support and resize/lifecycle cleanup were reviewed in the source.

The self-hosted Bricolage Grotesque and DM Sans fonts include their SIL Open Font License files in `public/fonts/`.

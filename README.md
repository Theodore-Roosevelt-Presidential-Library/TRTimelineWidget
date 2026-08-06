# TR Timeline Widget

An embeddable timeline of Theodore Roosevelt's life shown in relative history.
Roosevelt's life sits on top — chapter bars plus his key milestones. The United
States and the world sit below. Fits well under 400 pixels of height.

- **Self-contained.** One `tr-timeline.js` file, no dependencies, no build step.
- **Isolated.** Renders into a shadow root, so page styles never leak in and the
  widget never disturbs the host page.
- **On-brand.** References the Library's brand fonts (Dharma Gothic E, ITC
  Clearface, Frutiger Next) with safe fallbacks, and uses the brand palette.
- **Date-driven.** The embed code sets the window — no headline, no switcher.
- **Fit to range, explorable.** The window fills the frame. Hover or tap any
  moment for a tooltip; click to pin it in the readout; a cursor guide shows the
  year as you move across.
- **Centered axis.** The date ruler and the TR chapter bars form the middle
  band; Roosevelt's milestones sit above it, the U.S. and the world below.
- **Angled labels, responsive density.** Point labels are set on an angle so many
  fit on one line. Each milestone and event carries a `weight`; the widget keeps
  the highest-weight items that fit the width and time span, re-fitting on resize.
- **Precise dates.** Hover or click a point to see its exact date (e.g.
  “September 14, 1901”) alongside the description.
- **Any range, by year or month.** `data-start`/`data-end` accept `YYYY`,
  `YYYY-MM`, or `YYYY-MM-DD`. Tight windows switch the axis to month labels and
  spread same-year events out by their exact date.
- **Expand to full screen.** The icon in each timeline's top-right corner opens a
  full-screen **vertical** timeline of the same range — Roosevelt's life on the
  left, the U.S. and the world on the right, on a central spine — showing *every*
  point with its date and description, plus chapter dividers.

## Quick start

Drop in a container and one script tag, and set the range:

```html
<div data-tr-timeline data-start="1858" data-end="1919"></div>
<script src="tr-timeline.js"></script>
```

`tr-timeline.js` finds its own URL and loads `tr-data.js` from the same folder,
so that's the whole embed. Open `index.html` by double-clicking it, or serve it;
both work. `index.html` shows the full life, a Badlands slice, and a narrow embed.

(You can still include `tr-data.js` yourself before the widget if you prefer —
the widget will use it and skip the auto-load.)

## Period embeds

Any window works — a Badlands hub page just sets Badlands dates:

```html
<div data-tr-timeline data-start="1881" data-end="1891"></div>
```

Named shorthand is also available via `data-preset` (`full`, `earlylife`,
`badlands`, `risetopower`, `presidency`, `postpresidency`), but explicit dates
are the primary interface.

## Options

| Attribute     | Example  | Meaning |
|---------------|----------|---------|
| `data-start`  | `1858` · `1901-06` · `1901-06-15` | Start of range (year, month, or day) |
| `data-end`    | `1919` · `1901-09` | End of range (inclusive of the whole unit) |
| `data-preset` | `badlands` | Optional named range (overridden by start/end) |
| `data-src`    | `tr-data.json` | Fetch a JSON data file instead of using `tr-data.js` |

Every embed shows all chapters that fall within its window. A second, focused
embed is just a narrower date range — e.g. the Badlands years:

```html
<div data-tr-timeline data-start="1881" data-end="1891"></div>
```

From JavaScript:

```html
<div id="tl"></div>
<script src="tr-timeline.js"></script>
<script>TRTimeline.init('#tl', { start: 1900, end: 1910 });</script>
```

## Editing the content

All dates and descriptions live in **`tr-data.js`** — no need to touch the
widget code. It's plain data (JSON) with a one-line wrapper so it loads as a
script (which is why the page works from disk, not just from a server). It has
three lists:

- `phases` — the chapter bars on the center axis (`start`, `end`, `fill`, `ink`,
  `label`, `blurb`; add `"accent": true` for the orange underline).
- `events` — Roosevelt's milestones (above the axis).
- `history` — U.S. and world events (below the axis).

Each `events`/`history` entry has a `year`, an optional precise `date`, a short
`label` (the on-line caption), a `weight` (1–5 — higher weights survive when room
is tight), and a `blurb`. The `date` is shown on hover/click **and** sets the
exact horizontal position, so several events in one year fan out across a
zoomed-in embed (e.g. May / July / November 1898) instead of stacking. Wars are
entered as two points — a beginning and an end — not spans.

**Add a point** by copying a line in `events` or `history` and editing the
values. Give a TR `events` entry (or a phase) a `link` to a trlibrary.com page
and a secondary **Explore** button appears when that point is clicked.

> Prefer a real `.json` file (e.g. served on the same origin)? Set
> `data-src="path/to.json"` on the container and the widget fetches it instead.

## Hosting on GitHub Pages

This repo deploys to GitHub Pages via GitHub Actions on every push to `main`
(see `.github/workflows/deploy.yml`), served at the custom domain in `CNAME`:
**https://timeline.labs.trlibrary.com**. The embed on any page is then:

```html
<div data-tr-timeline data-start="1881" data-end="1891"></div>
<script src="https://timeline.labs.trlibrary.com/tr-timeline.js"></script>
```

(The widget auto-loads `tr-data.js` from the same host, so cross-origin embeds on
other sites still need only this one tag.)

## A note on accuracy

Dates are drawn from well-established Roosevelt scholarship. Before publishing,
verify any figure against the Theodore Roosevelt Center (trlibrary.com/gpt). No
Roosevelt quotations are reproduced verbatim in the widget; descriptions
paraphrase, and the “Man in the Arena” reference names the speech rather than
quoting it.

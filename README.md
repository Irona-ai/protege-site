# protege.sh

Static marketing site for Protégé. Two pages, no build step, no dependencies.

```
index.html              landing page
benchmarks/index.html   full benchmark results
team/index.html         about, founder bio, roster
assets/css/site.css     all styles, Firecrawl design tokens
assets/js/site.js       nav hairline state and scroll reveals
assets/fonts/           self-hosted Inter and Geist Mono (latin + latin-ext woff2)
assets/logos/           customer logos, each brand's own published mark
assets/og.html          source for og.png, rendered with headless Chrome
CNAME                   protege.sh
.nojekyll               tells Pages to serve assets/ untouched
```

## Local preview

```bash
python3 -m http.server 8123
```

Then open http://localhost:8123.

## Design system

Ported from [firecrawl/open-scouts DESIGN_SYSTEM.md](https://github.com/firecrawl/open-scouts/blob/main/DESIGN_SYSTEM.md)
into plain CSS custom properties in `assets/css/site.css`.

- `--heat-100` `#fa5d19` is the only accent. It carries fills, strokes, borders and
  display numerals. At text size it reads 3.14:1 on white, so anything at text size
  uses `--heat-text` `#cc4a0e` (4.59:1) instead. Do not put `--heat-100` on small text.
- Suisse Intl is licensed, so Inter (the system's documented fallback) carries the
  sans role. Geist Mono carries measurement, data and labels.
- Type scale is the system's semantic scale verbatim: `.t-h1` through `.t-h5`,
  `.b-xl` through `.b-sm`, `.m-md` through `.m-xs`.
- Radii are pixel values only: 4 for badges, 6 for buttons and inputs, 8 for cards.
- Text colors come from `--text-2` and `--text-3`, both contrast-checked against
  `#ffffff` and `#fbfaf9`. The raw alpha ramp (`--black-a40` and friends) is for
  borders and fills, not for type.

The page is light-locked. The proof section is the one deliberate dark band.

## Regenerating the social card

Edit `assets/og.html`, then:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu --hide-scrollbars --window-size=1200,630 --screenshot=assets/og.png "file://$PWD/assets/og.html"
```

## Deploying to GitHub Pages

1. Create the repo and push:

```bash
gh repo create <org>/protege-site --private --source=. --remote=origin --push
```

2. In the repo settings, under Pages, set Source to "Deploy from a branch",
   branch `main`, folder `/ (root)`.

3. Point DNS at Pages. For the apex `protege.sh`, four A records:

```
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

   Add `www` as a CNAME to `<org>.github.io` if you want it to resolve.
   The `CNAME` file in this repo already declares the custom domain, so Pages
   picks it up on the first deploy. Enable "Enforce HTTPS" once the certificate
   is issued.

## The customer logo wall

Each mark in `assets/logos/` is the brand's own published logo, pulled from their
site. They are rendered as single-ink silhouettes (`filter: brightness(0) saturate(0)`
at 68% opacity) so six unrelated palettes do not compete with the page's one accent.
The 68% is a floor, not a taste call: Lorikeet is live text rather than an image, so
it is held to text contrast and needs 4.5:1.
Per-logo optical height is set inline with `--h` because the marks have different
cap heights; match by eye, not by number.

Lorikeet publishes no wordmark SVG and their bird mark silhouettes into an
unreadable blob, so their name is set in type. Swap in the real file when they
send one.

The wall is a seamless marquee: two identical `.logo-track` lists inside
`.logo-marquee-inner`, translated by exactly `-50%`. If you add or remove a
logo, change it in **both** tracks or the loop will jump. The second track is
`aria-hidden` and its images carry empty `alt`, so screen readers read each
brand once. It pauses on hover. Under `prefers-reduced-motion: reduce` the
animation stops, the duplicate track is hidden, and the logos wrap as a static row.
It is the only moving strip on the page; keep it that way.

## Sections that carry an argument

Three sections do work that a rewrite can quietly destroy.

**The cost meter** (`.meter`) walks one unit price up a scale: $0.018 a call to
$18,000 a million, against $200 for the same million on a specialist. The unit
prices are real and the volumes are not a customer's bill, which is why the note
under it says so. Do not swap the scale for invented customer numbers.

**Proof** (`.chart`) is three bar comparisons, and every one states its own scale
(`bars run 0 to 0.70`, `bars to scale`). A bar chart without its scale printed is
a lie by omission; if you change a number, change the width and the scale note.

**The loop** (`.loop`) is a 2x2 grid read clockwise with the ring in the gutter.
Step 3 is named Train, but the copy says most bounded workflows never reach a
training run, because that is what the benchmarks support. Keep the label and the
caveat together. The ring is `aria-hidden` decoration over a real `<ol>`, and it
is dropped below 900px where a 2x2 ring is no longer a ring.

## Navigation

Three items plus the CTA: **Product** (jumps to the four-step loop), **About**
(the team page), **Contact** (mailto). Benchmarks is deliberately not in the nav;
it is reached from the hero's secondary button, from each proof block, and from
both footers. If that page stops getting traffic, the nav is the first place to
look.

## Calls to action

One label, one destination: **Book a call**, to `https://cal.com/tushar-ironlabs`,
in the nav, the hero, the closing card and the footer on both pages. There is no
email capture form. If you add a second CTA, give it a different job (the only
other one is "Read the benchmarks") or it will read as two buttons competing.

## Editing content

Every number on both pages traces to the pre-seed deck and keeps its qualifier
(n count, standard deviation, cost basis). If you change a figure, change the
qualifier with it. The benchmarks page prints the runs that lost on purpose;
removing them removes the reason the rest is believable.

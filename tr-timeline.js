/*!
 * TR Timeline Widget
 * A self-contained, embeddable timeline of Theodore Roosevelt's life shown
 * against major events in United States and world history.
 *
 * Theodore Roosevelt Presidential Library
 *
 * Embed:
 *   <div data-tr-timeline data-start="1858" data-end="1919"></div>
 *   <script src="tr-timeline.js"></script>
 *
 * The content lives in tr-data.json (loaded at runtime). Point a widget at a
 * different file with data-src="path/to.json". Options: data-start, data-end,
 * data-preset, data-src. See README.md.
 *
 * Renders into a shadow root so page styles never leak in and the widget never
 * disturbs the host page. Brand fonts are referenced first and inherit from the
 * host page when present, with safe fallbacks.
 *
 * NOTE: dates are drawn from well-established Roosevelt scholarship. Verify
 * against the Theodore Roosevelt Center (trlibrary.com/gpt) before publishing.
 */
(function () {
  "use strict";

  var DEFAULT_SRC = "tr-data.json";

  // Named period shorthands (data-preset). Explicit data-start/-end win.
  var PRESETS = {
    full:           { start: 1855, end: 1921 },
    earlylife:      { start: 1855, end: 1884 },
    badlands:       { start: 1881, end: 1891 },
    risetopower:    { start: 1887, end: 1902 },
    presidency:     { start: 1900, end: 1910 },
    postpresidency: { start: 1908, end: 1921 }
  };

  /* ------------------------------------------------------------------ *
   *  STYLES (injected into the shadow root)
   * ------------------------------------------------------------------ */
  var CSS = "" +
    ":host{all:initial;display:block;}" +
    "*{box-sizing:border-box;}" +
    ".trtl{" +
      "--display:'Dharma Gothic E','Oswald','Anton Narrow',sans-serif;" +
      "--body:'ITC Clearface','Clearface',Georgia,'Times New Roman',serif;" +
      "--caption:'Frutiger Next','Frutiger','Inter',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;" +
      "--ink:#25282A;--sand:#D1CCBD;--paper:#ffffff;--line:#c9c3b4;--orange:#E7805D;--graysky:#99ADC5;" +
      "font-family:var(--caption);color:var(--ink);background:var(--paper);" +
      "border:1px solid var(--line);border-radius:6px;padding:16px 18px 14px;" +
      "position:relative;width:100%;overflow:hidden;-webkit-font-smoothing:antialiased;}" +
    ".trtl.trtl-plain{border:none;border-radius:0;background:transparent;overflow:visible;}" +

    ".trtl-chart{position:relative;user-select:none;}" +
    ".trtl-fs{position:absolute;top:12px;right:14px;z-index:8;width:26px;height:26px;display:flex;" +
      "align-items:center;justify-content:center;padding:0;border:1px solid var(--line);background:#fff;" +
      "border-radius:4px;color:#6c6a61;cursor:pointer;transition:border-color .12s,color .12s;}" +
    ".trtl-fs:hover,.trtl-fs:focus-visible{border-color:var(--orange);color:var(--orange);outline:none;}" +
    ".trtl-fs svg{width:14px;height:14px;}" +
    ".trtl-bandlabel{font-family:var(--caption);font-size:9.5px;letter-spacing:.09em;text-transform:uppercase;" +
      "color:#8a887e;margin:0 0 4px;}" +
    ".trtl-bandlabel.trtl-us{margin:6px 0 0;}" +
    ".trtl-track{position:relative;width:100%;}" +

    /* stacked regions: TR above · center bar (chapters + dates) · world below */
    ".trtl-up{position:relative;height:86px;margin-bottom:10px;}" +
    ".trtl-center{position:relative;}" +
    ".trtl-down{position:relative;height:86px;margin-top:10px;}" +
    ".trtl-hpoints{position:absolute;left:0;right:0;top:0;bottom:0;}" +

    /* phase (chapter) bars on the center axis */
    ".trtl-phases{height:22px;margin-bottom:6px;}" +
    ".trtl-phase{position:absolute;top:0;bottom:0;border-radius:2px;overflow:hidden;cursor:pointer;" +
      "display:flex;align-items:center;padding:0 7px;transition:filter .12s,box-shadow .12s;}" +
    ".trtl-phase:hover,.trtl-phase:focus-visible{outline:none;filter:brightness(1.04);box-shadow:0 0 0 2px var(--orange) inset;}" +
    ".trtl-phase span{font-family:var(--display);text-transform:uppercase;letter-spacing:.01em;font-size:10.5px;" +
      "white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:700;}" +
    ".trtl-phase.accent::after{content:'';position:absolute;left:0;right:0;bottom:0;height:2px;background:var(--orange);}" +

    /* markers: a dot on the bar + an angled label (all angled one direction) */
    ".trtl-mark{position:absolute;width:0;cursor:pointer;}" +
    ".trtl-up .trtl-mark{bottom:0;}" +
    ".trtl-down .trtl-mark{top:0;}" +
    ".trtl-mark .dot{position:absolute;left:0;}" +
    ".trtl-up .dot{bottom:0;width:11px;height:11px;border-radius:50%;background:var(--ink);border:2px solid var(--paper);" +
      "box-shadow:0 0 0 1.5px var(--ink);transform:translateX(-50%);transition:transform .12s;}" +
    ".trtl-down .dot{top:0;width:9px;height:9px;background:var(--graysky);border:2px solid var(--paper);" +
      "box-shadow:0 0 0 1.5px #6f8399;transform:translateX(-50%) rotate(45deg);transition:transform .12s;}" +
    ".trtl-up .trtl-mark:hover .dot,.trtl-up .trtl-mark:focus-visible .dot{transform:translateX(-50%) scale(1.25);}" +
    ".trtl-down .trtl-mark:hover .dot,.trtl-down .trtl-mark:focus-visible .dot{transform:translateX(-50%) rotate(45deg) scale(1.2);}" +
    /* label anchored at the dot and rotated so dot + text are collinear, with a
       small gap so the text isn't right up against the dot */
    ".trtl-mark .cap{position:absolute;left:0;white-space:nowrap;font-family:var(--caption);font-size:9px;" +
      "line-height:1;color:#5a584f;max-width:80px;overflow:hidden;text-overflow:ellipsis;}" +
    ".trtl-up .cap{bottom:1px;transform-origin:left center;transform:rotate(-45deg) translateX(9px);}" +
    ".trtl-down .cap{top:0;transform-origin:left center;transform:rotate(45deg) translateX(9px);}" +
    ".trtl-mark:focus-visible{outline:none;}" +
    ".trtl-mark:focus-visible .cap{color:var(--orange);text-decoration:underline;}" +

    /* date axis */
    ".trtl-axis{position:relative;height:22px;margin:2px 0 4px;border-top:1.5px solid var(--ink);}" +
    ".trtl-tick{position:absolute;top:0;transform:translateX(-50%);text-align:center;}" +
    ".trtl-tick i{display:block;width:1px;height:5px;background:var(--ink);margin:0 auto;}" +
    ".trtl-tick b{font-family:var(--caption);font-weight:600;font-size:10px;color:#3f3d37;letter-spacing:.02em;}" +

    /* cursor guide */
    ".trtl-cursor{position:absolute;top:0;bottom:0;width:1px;background:rgba(231,128,93,.55);pointer-events:none;opacity:0;transition:opacity .1s;z-index:5;}" +
    ".trtl-cursor b{position:absolute;top:-2px;left:50%;transform:translateX(-50%);background:var(--orange);color:#fff;" +
      "font-family:var(--caption);font-size:9.5px;font-weight:600;padding:1px 5px;border-radius:3px;white-space:nowrap;}" +
    ".trtl-chart.live .trtl-cursor{opacity:1;}" +

    /* detail readout */
    ".trtl-detail{margin-top:12px;border-top:1px solid var(--line);padding-top:9px;min-height:42px;display:flex;gap:12px;align-items:flex-start;}" +
    ".trtl-detail .yr{display:flex;flex-direction:column;min-width:56px;}" +
    ".trtl-detail .yr .y{font-family:var(--display);font-size:22px;line-height:.9;font-weight:700;color:var(--orange);}" +
    ".trtl-detail .yr .md{font-family:var(--caption);font-size:10.5px;font-weight:600;color:#8a887e;letter-spacing:.02em;" +
      "white-space:nowrap;margin-top:4px;}" +
    ".trtl-detail .bd{flex:1;font-family:var(--body);font-size:13px;line-height:1.34;color:#33322c;}" +
    ".trtl-detail .bd strong{font-family:var(--caption);text-transform:uppercase;letter-spacing:.05em;font-size:10.5px;" +
      "display:block;color:#8a887e;font-weight:600;margin-bottom:1px;}" +
    ".trtl-detail .bd .date{font-family:var(--caption);font-style:normal;font-size:11px;color:var(--orange);" +
      "font-weight:600;display:block;margin-bottom:3px;}" +
    /* secondary button, matching trlibrary.com (.btn-secondary) */
    ".trtl-detail .act{flex:none;}" +
    ".trtl-explore{display:flex;width:fit-content;align-items:center;gap:6px;white-space:nowrap;" +
      "font-family:var(--caption);font-weight:700;font-size:12.5px;color:var(--ink);background:transparent;" +
      "border:1px solid var(--ink);border-radius:2px;padding:7px 16px;text-decoration:none;cursor:pointer;" +
      "transition:background .12s,color .12s;}" +
    ".trtl-explore:hover,.trtl-explore:focus-visible{background:var(--ink);color:#fff;outline:none;}" +
    ".trtl-explore svg{width:12px;height:12px;flex:none;}" +
    ".trtl-detail.empty .yr{display:none;}" +
    ".trtl-detail.empty .bd{display:flex;gap:16px;flex-wrap:wrap;padding-top:6px;}" +
    ".trtl-hint{display:inline-flex;align-items:center;gap:6px;font-family:var(--caption);font-size:11.5px;color:#a19f95;}" +
    ".trtl-hint svg{flex:none;color:var(--orange);}" +

    /* tooltip */
    ".trtl-tip{position:absolute;z-index:20;pointer-events:none;max-width:230px;background:var(--ink);color:#fff;" +
      "font-family:var(--caption);font-size:11.5px;line-height:1.3;padding:7px 9px;border-radius:5px;opacity:0;" +
      "transform:translateY(3px);transition:opacity .1s,transform .1s;box-shadow:0 6px 18px rgba(0,0,0,.22);}" +
    ".trtl-tip.on{opacity:1;transform:translateY(0);}" +
    ".trtl-tip b{font-family:var(--display);text-transform:uppercase;letter-spacing:.02em;font-size:12px;display:block;margin-bottom:2px;}" +
    ".trtl-tip i{color:var(--orange);font-style:normal;font-weight:600;}";

  /* ------------------------------------------------------------------ *
   *  HELPERS
   * ------------------------------------------------------------------ */
  function el(tag, cls, attrs) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function tickStep(spanYears) {
    var steps = [1, 2, 5, 10, 20, 25, 50], target = spanYears / 7;
    for (var i = 0; i < steps.length; i++) if (steps[i] >= target) return steps[i];
    return 100;
  }

  // A point's exact position is a fractional year parsed from its `date`, so
  // several events in one year spread out in a zoomed-in embed. Falls back to
  // mid-year when only a year is known.
  var MONTHS = { january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11 };
  function toDecimal(item) {
    var d = item.date, m;
    if (d) {
      m = /^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/.exec(d);
      if (m && MONTHS[m[1].toLowerCase()] != null)
        return +m[3] + (MONTHS[m[1].toLowerCase()] + (Math.min(+m[2], 31) - 0.5) / 31) / 12;
      m = /^([A-Za-z]+)\s+(\d{4})$/.exec(d);
      if (m && MONTHS[m[1].toLowerCase()] != null)
        return +m[2] + (MONTHS[m[1].toLowerCase()] + 0.5) / 12;
      m = /^(\d{4})$/.exec(d);
      if (m) return +m[1] + 0.5;
    }
    return (item.year || 0) + 0.5;
  }

  var MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // Parse a data-start / data-end bound: "YYYY", "YYYY-MM", or "YYYY-MM-DD"
  // (numbers accepted too). Start bounds resolve to the beginning of the unit,
  // end bounds to the end — so "1901" as end includes all of 1901, and
  // "1901-06" includes all of June 1901.
  function parseBound(v, isEnd) {
    if (v == null) return null;
    var s = String(v).trim(), m;
    m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
    if (m) return +m[1] + ((+m[2] - 1) + (isEnd ? +m[3] : +m[3] - 1) / 31) / 12;
    m = /^(\d{4})-(\d{1,2})$/.exec(s);
    if (m) return +m[1] + ((+m[2] - 1) + (isEnd ? 1 : 0)) / 12;
    m = /^(\d{4})$/.exec(s);
    if (m) return +m[1] + (isEnd ? 1 : 0);
    var n = +s;
    return isNaN(n) ? null : (isEnd ? n + 1 : n);
  }

  // Label a decimal position as a year, or "Mon YYYY" when zoomed in tight.
  function decToLabel(pos, withMonth) {
    var y = Math.floor(pos + 1e-6);
    if (!withMonth) return String(y);
    var mo = Math.floor((pos - y) * 12 + 1e-6);
    return MONTH_ABBR[Math.max(0, Math.min(11, mo))] + " " + y;
  }

  /* ------------------------------------------------------------------ *
   *  BUILD
   * ------------------------------------------------------------------ */
  function build(host, opts) {
    opts = opts || {};
    var data = opts.data;
    if (!data) return;

    var preset = opts.preset && PRESETS[opts.preset] ? PRESETS[opts.preset] : null;
    var startRaw = opts.start != null ? opts.start : (preset ? preset.start : (data.born || 1858) - 3);
    var endRaw   = opts.end   != null ? opts.end   : (preset ? preset.end   : (data.died || 1919) + 2);
    // Bounds may be "YYYY", "YYYY-MM", or "YYYY-MM-DD" — resolved to decimal years.
    var startPos = parseBound(startRaw, false);
    var endPos   = parseBound(endRaw, true);
    if (endPos <= startPos) endPos = startPos + 1;
    var span = endPos - startPos;
    var subYear = span <= 2.2; // show month labels once the window is this tight

    // Horizontal gutters keep the angled end-labels on the canvas: the timeline
    // (bars, axis, points) is inset within [GUT_L, width - GUT_R] rather than
    // running edge to edge. Positions are CSS calc() so they stay responsive.
    var GUT_L = 14, GUT_R = 64;
    function frac(v) { return clamp((v - startPos) / span, 0, 1); }
    function leftCss(v) {
      return "calc(" + GUT_L + "px + " + frac(v) + " * (100% - " + (GUT_L + GUT_R) + "px))";
    }
    function widthCss(a, b) {
      return "calc(" + (frac(b) - frac(a)) + " * (100% - " + (GUT_L + GUT_R) + "px))";
    }
    function xpx(v, width) { return GUT_L + frac(v) * Math.max(1, width - GUT_L - GUT_R); }
    function inWindow(p) { return p >= startPos && p <= endPos; }   // a decimal point
    function phaseIn(a, b) { return b >= startPos && a <= endPos; } // a phase (year span)

    // Keep the highest-weight points that fit the inner band, then drop any
    // within `minPx` of a kept neighbour so labels never pile up.
    function pos(p) { return p.__pos != null ? p.__pos : p.year; }
    // Place the highest-weight points first; keep any later point that clears
    // `minPx` of everything already placed. This packs the line as densely as it
    // can while the biggest moments always win their spot.
    function pickVisible(pts, width, minPx) {
      var placed = [], kept = [];
      pts.slice().sort(function (a, b) {
        return (b.weight || 1) - (a.weight || 1) || pos(a) - pos(b);
      }).forEach(function (p) {
        var px = xpx(pos(p), width);
        for (var i = 0; i < placed.length; i++) if (Math.abs(px - placed[i]) < minPx) return;
        placed.push(px); kept.push(p);
      });
      return kept.sort(function (a, b) { return pos(a) - pos(b); });
    }
    var EV_MIN = 20, HIST_MIN = 20;

    var root = host.shadowRoot || host.attachShadow({ mode: "open" });
    root.innerHTML = "";
    root.appendChild(Object.assign(el("style"), { textContent: CSS }));
    var wrap = el("div", "trtl"); root.appendChild(wrap);
    if (opts.width) wrap.style.width = opts.width + "px";
    if (opts.showAll) wrap.classList.add("trtl-plain");
    var chart = el("div", "trtl-chart"); wrap.appendChild(chart);

    // -- expand-to-full-screen control (hidden in the full-screen view itself)
    if (!opts.showAll) {
      var fsBtn = el("button", "trtl-fs", { type: "button", "aria-label": "Expand to full timeline" });
      fsBtn.innerHTML = "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' " +
        "stroke-linecap='round' stroke-linejoin='round'><path d='M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5'/></svg>";
      fsBtn.addEventListener("click", openFullscreen);
      wrap.appendChild(fsBtn);
    }

    // -- TR label
    var trLabel = el("div", "trtl-bandlabel"); trLabel.textContent = data.subject || "Theodore Roosevelt";
    chart.appendChild(trLabel);

    // -- TR key events ABOVE the center bar
    var up = el("div", "trtl-up"); chart.appendChild(up);
    var evPts = (data.events || []).map(function (e) { e.__pos = toDecimal(e); return e; })
                                   .filter(function (e) { return inWindow(e.__pos); })
                                   .sort(function (a, b) { return a.__pos - b.__pos; });
    function layoutEvents() {
      var width = chart.getBoundingClientRect().width || chart.clientWidth || 0;
      if (!width) return;
      up.innerHTML = "";
      (opts.showAll ? evPts : pickVisible(evPts, width, EV_MIN)).forEach(function (e) {
        var m = el("div", "trtl-mark", { tabindex: "0", role: "button" });
        m.style.left = leftCss(e.__pos);
        var dot = el("div", "dot");
        var cap = el("div", "cap"); cap.textContent = e.label;
        m.appendChild(dot); m.appendChild(cap);
        bindItem(m, { yr: String(e.year), date: e.date, title: e.label, blurb: e.blurb, accent: e.accent, link: e.link });
        up.appendChild(m);
      });
    }

    // -- CENTER: chapter bars on the date axis
    var center = el("div", "trtl-center"); chart.appendChild(center);
    var phases = el("div", "trtl-track trtl-phases");
    (data.phases || []).forEach(function (p) {
      if (!phaseIn(p.start, p.end)) return;
      var b = el("div", "trtl-phase" + (p.accent ? " accent" : ""), { tabindex: "0", role: "button" });
      b.style.left = leftCss(p.start); b.style.width = widthCss(p.start, p.end);
      b.style.background = p.fill; b.style.color = p.ink;
      var s = el("span"); s.textContent = p.label; b.appendChild(s);
      bindItem(b, { yr: p.start + "–" + p.end, title: p.label, blurb: p.blurb, link: p.link });
      phases.appendChild(b);
    });
    center.appendChild(phases);

    var axis = el("div", "trtl-axis");
    (function () {
      var ticks = [];
      if (!subYear) {
        var step = tickStep(span), firstY = Math.ceil(startPos / step) * step;
        for (var y = firstY; y < endPos - 1e-6; y += step)
          if (y >= startPos - 1e-6) ticks.push({ pos: y, label: String(y) });
      } else {
        var months = span * 12, choices = [1, 2, 3, 6], mstep = 6;
        for (var k = 0; k < choices.length; k++) if (choices[k] >= months / 8) { mstep = choices[k]; break; }
        var m0 = Math.ceil(startPos * 12 / mstep) * mstep;
        for (var mm = m0; mm <= endPos * 12 + 1e-6; mm += mstep) {
          var pv = mm / 12;
          if (pv < startPos - 1e-6) continue;
          ticks.push({ pos: pv, label: MONTH_ABBR[((Math.round(mm) % 12) + 12) % 12] + " " + Math.floor(mm / 12 + 1e-6) });
        }
      }
      ticks.forEach(function (t) {
        var el2 = el("div", "trtl-tick"); el2.style.left = leftCss(t.pos);
        el2.appendChild(el("i")); var b2 = el("b"); b2.textContent = t.label; el2.appendChild(b2);
        axis.appendChild(el2);
      });
    })();
    center.appendChild(axis);

    // -- U.S. & world BELOW the center bar
    var down = el("div", "trtl-down"); chart.appendChild(down);
    var hpoints = el("div", "trtl-hpoints"); down.appendChild(hpoints);
    var usLabel = el("div", "trtl-bandlabel trtl-us"); usLabel.textContent = "United States & the World";
    chart.appendChild(usLabel);

    var histPts = (data.history || []).map(function (h) { h.__pos = toDecimal(h); return h; })
                                      .filter(function (h) { return inWindow(h.__pos); })
                                      .sort(function (a, b) { return a.__pos - b.__pos; });
    function layoutHistory() {
      var width = chart.getBoundingClientRect().width || chart.clientWidth || 0;
      if (!width) return;
      hpoints.innerHTML = "";
      (opts.showAll ? histPts : pickVisible(histPts, width, HIST_MIN)).forEach(function (h) {
        var m = el("div", "trtl-mark", { tabindex: "0", role: "button" });
        m.style.left = leftCss(h.__pos);
        var dot = el("div", "dot");
        var cap = el("div", "cap"); cap.textContent = h.label;
        m.appendChild(dot); m.appendChild(cap);
        bindItem(m, { yr: String(h.year), date: h.date, title: h.label, blurb: h.blurb });
        hpoints.appendChild(m);
      });
    }

    layoutEvents(); layoutHistory();
    if (window.ResizeObserver) {
      new ResizeObserver(function () { layoutEvents(); layoutHistory(); }).observe(chart);
    }

    // -- cursor guide
    var cursor = el("div", "trtl-cursor"); var cyr = el("b"); cursor.appendChild(cyr);
    chart.appendChild(cursor);
    chart.addEventListener("pointermove", function (ev) {
      var rect = chart.getBoundingClientRect();
      var px = clamp(ev.clientX - rect.left, 0, rect.width);
      chart.classList.add("live");
      cursor.style.left = px + "px";
      var f = clamp((px - GUT_L) / Math.max(1, rect.width - GUT_L - GUT_R), 0, 1);
      cyr.textContent = decToLabel(startPos + f * span, subYear);
    });
    chart.addEventListener("pointerleave", function () { chart.classList.remove("live"); });

    // -- tooltip
    var tip = el("div", "trtl-tip"); wrap.appendChild(tip);
    function showTip(target, d) {
      tip.innerHTML = "";
      var b = el("b"); b.textContent = d.title;
      var yr = el("i"); yr.textContent = d.date || d.yr;
      var bd = el("div"); bd.textContent = d.blurb;
      tip.appendChild(b); tip.appendChild(yr); tip.appendChild(document.createElement("br")); tip.appendChild(bd);
      tip.classList.add("on");
      var wr = wrap.getBoundingClientRect(), tr = target.getBoundingClientRect();
      var left = tr.left - wr.left + tr.width / 2;
      tip.style.left = clamp(left - tip.offsetWidth / 2, 4, wr.width - tip.offsetWidth - 4) + "px";
      var top = tr.top - wr.top - tip.offsetHeight - 8;
      if (top < 0) top = tr.bottom - wr.top + 8;
      tip.style.top = top + "px";
    }
    function hideTip() { tip.classList.remove("on"); }

    // -- detail readout (click to pin)
    var detail = el("div", "trtl-detail empty");
    var dyr = el("div", "yr"), dbd = el("div", "bd");
    dbd.innerHTML =
      "<span class='trtl-hint'>" +
        "<svg viewBox='0 0 24 24' width='13' height='13' fill='none' stroke='currentColor' stroke-width='2' stroke-linejoin='round'><path d='M5 3l14 7-6 2-2 6z'/></svg>" +
        "Hover or tap to preview</span>" +
      "<span class='trtl-hint'>" +
        "<svg viewBox='0 0 24 24' width='13' height='13' fill='none' stroke='currentColor' stroke-width='2'><circle cx='12' cy='12' r='7'/><circle cx='12' cy='12' r='2' fill='currentColor' stroke='none'/></svg>" +
        "Click to keep it here</span>";
    var dact = el("div", "act");
    detail.appendChild(dyr); detail.appendChild(dbd); detail.appendChild(dact);
    if (opts.detailHost) {
      // Render the readout into a separate, viewport-width host (used in full
      // screen) so it never scrolls off with the wide track area.
      detail.style.marginTop = "0"; detail.style.borderTop = "none";
      var droot = opts.detailHost.shadowRoot || opts.detailHost.attachShadow({ mode: "open" });
      droot.innerHTML = "";
      droot.appendChild(Object.assign(el("style"), { textContent: CSS }));
      var dwrap = el("div", "trtl");
      dwrap.style.border = "none"; dwrap.style.background = "transparent"; dwrap.style.padding = "8px 18px 10px";
      dwrap.appendChild(detail);
      droot.appendChild(dwrap);
    } else {
      wrap.appendChild(detail);
    }
    function setDetail(d) {
      detail.classList.remove("empty");
      // Big year on top; the month + day (no repeated year) just beneath it.
      dyr.innerHTML = "";
      var y = el("span", "y"); y.textContent = d.yr; dyr.appendChild(y);
      var md = d.date ? d.date.replace(/,?\s*\d{4}$/, "").trim() : "";
      if (md) { var mdEl = el("span", "md"); mdEl.textContent = md; dyr.appendChild(mdEl); }
      dbd.innerHTML = "";
      var kicker = el("strong"); kicker.textContent = d.title; dbd.appendChild(kicker);
      dbd.appendChild(document.createTextNode(d.blurb));
      dact.innerHTML = "";
      if (d.link) {
        var a = el("a", "trtl-explore", { href: d.link, target: "_top", rel: "noopener" });
        a.innerHTML = "Explore <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' " +
          "stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'><path d='M5 12h14M13 6l6 6-6 6'/></svg>";
        dact.appendChild(a);
      }
    }

    function bindItem(node, d) {
      node.addEventListener("pointerenter", function () { showTip(node, d); });
      node.addEventListener("pointerleave", hideTip);
      node.addEventListener("focus", function () { showTip(node, d); setDetail(d); });
      node.addEventListener("blur", hideTip);
      node.addEventListener("click", function () { setDetail(d); });
      node.addEventListener("keydown", function (e2) {
        if (e2.key === "Enter" || e2.key === " ") { e2.preventDefault(); setDetail(d); }
      });
    }

    // Width for the full-screen view: wide enough to space the closest pair of
    // points by roughly the label gap, so every in-range point can show.
    function fullscreenWidth() {
      var vw = (window.innerWidth || 1000) - 8;
      var n = Math.max(evPts.length, histPts.length);
      var gaps = [];
      [evPts, histPts].forEach(function (list) {
        for (var i = 1; i < list.length; i++) { var g = list[i].__pos - list[i - 1].__pos; if (g > 0) gaps.push(g); }
      });
      var minGap = gaps.length ? Math.min.apply(null, gaps) : span;
      var needed = (EV_MIN + 10) * span / Math.max(minGap, span / 600);
      return Math.round(clamp(Math.max(vw, n * (EV_MIN + 12), needed), vw, 9000));
    }

    function openFullscreen() {
      var w = fullscreenWidth();
      var ov = el("div", null, { "class": "trtl-overlay" });
      ov.setAttribute("style", "position:fixed;inset:0;z-index:2147483000;background:#fff;" +
        "display:flex;flex-direction:column;font-family:'Frutiger Next','Inter',system-ui,-apple-system,sans-serif;");
      var bar = el("div"); bar.setAttribute("style", "flex:0 0 auto;display:flex;align-items:center;" +
        "justify-content:space-between;gap:12px;padding:12px 18px;border-bottom:1px solid #e2ddd0;");
      var ttl = el("div"); ttl.setAttribute("style", "font-family:'Dharma Gothic E','Oswald',sans-serif;" +
        "text-transform:uppercase;letter-spacing:.03em;font-size:16px;color:#25282A;");
      ttl.textContent = (data.subject || "Theodore Roosevelt") + " · " +
        decToLabel(startPos, subYear) + " – " + decToLabel(endPos - 1e-6, subYear);
      var hintr = el("div"); hintr.setAttribute("style", "font-size:11.5px;color:#8a887e;");
      hintr.textContent = "Scroll sideways to explore →";
      var xb = el("button"); xb.setAttribute("style", "border:1px solid #25282A;background:#fff;border-radius:2px;" +
        "font:700 13px 'Frutiger Next',system-ui,sans-serif;padding:6px 14px;cursor:pointer;color:#25282A;");
      xb.textContent = "Close ✕";
      var right = el("div"); right.setAttribute("style", "display:flex;align-items:center;gap:16px;");
      right.appendChild(hintr); right.appendChild(xb);
      bar.appendChild(ttl); bar.appendChild(right);
      // The tracks scroll horizontally; the detail readout below stays pinned to
      // the viewport so a clicked point is always visible however far you scroll.
      var scroller = el("div"); scroller.setAttribute("style", "flex:1;overflow-x:auto;overflow-y:hidden;" +
        "display:flex;align-items:center;padding:10px 16px;");
      var innerHost = el("div"); innerHost.style.width = w + "px"; innerHost.style.flex = "0 0 auto";
      scroller.appendChild(innerHost);
      var detailHost = el("div"); detailHost.setAttribute("style", "flex:0 0 auto;border-top:1px solid #e2ddd0;background:#fff;");
      ov.appendChild(bar); ov.appendChild(scroller); ov.appendChild(detailHost);
      document.body.appendChild(ov);
      build(innerHost, { data: data, start: startRaw, end: endRaw, showAll: true, width: w, detailHost: detailHost });
      function close() { ov.remove(); document.removeEventListener("keydown", onKey); }
      function onKey(e) { if (e.key === "Escape") close(); }
      xb.addEventListener("click", close);
      document.addEventListener("keydown", onKey);
    }
  }

  /* ------------------------------------------------------------------ *
   *  DATA LOADING (external JSON, fetched once per URL)
   * ------------------------------------------------------------------ */
  var _cache = {};
  function loadData(src) {
    if (!_cache[src]) {
      _cache[src] = fetch(src, { cache: "no-cache" }).then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      });
    }
    return _cache[src];
  }

  function fromAttrs(host) {
    var o = {};
    if (host.dataset.preset) o.preset = host.dataset.preset;
    // Kept as strings so "YYYY-MM" and "YYYY-MM-DD" survive to parseBound.
    if (host.dataset.start != null && host.dataset.start !== "") o.start = host.dataset.start;
    if (host.dataset.end != null && host.dataset.end !== "") o.end = host.dataset.end;
    return o;
  }

  /* ------------------------------------------------------------------ *
   *  PUBLIC API + AUTO-INIT
   * ------------------------------------------------------------------ */
  function showError(host, msg) {
    var root = host.shadowRoot || host.attachShadow({ mode: "open" });
    root.innerHTML = "<div style=\"font:13px/1.4 system-ui,sans-serif;color:#8a6d3b;" +
      "background:#faf6ec;border:1px solid #e6dcc2;border-radius:6px;padding:12px 14px;\">" + msg + "</div>";
  }

  var TRTimeline = {
    init: function (elm, opts) {
      var host = typeof elm === "string" ? document.querySelector(elm) : elm;
      if (!host) return null;
      opts = opts || fromAttrs(host);
      if (opts.data) { build(host, opts); return host; }

      // Prefer inline data (window.TRTimelineData from tr-data.js) — this works
      // even when the page is opened from disk. Only fetch when a data-src is
      // given or no inline data is present.
      var src = opts.src || host.dataset.src;
      if (!src && window.TRTimelineData) {
        build(host, Object.assign({}, opts, { data: window.TRTimelineData }));
        return host;
      }
      src = src || DEFAULT_SRC;
      loadData(src).then(function (data) {
        build(host, Object.assign({}, opts, { data: data }));
      }).catch(function (err) {
        console.error("TR Timeline: could not load data from " + src, err);
        showError(host, "Timeline data didn’t load. Include <code>tr-data.js</code> " +
          "before <code>tr-timeline.js</code>, or serve <code>" + src + "</code> over http.");
      });
      return host;
    },
    presets: PRESETS
  };

  function autoInit() {
    var nodes = document.querySelectorAll("[data-tr-timeline]");
    for (var i = 0; i < nodes.length; i++) {
      if (!nodes[i].__trInit) { nodes[i].__trInit = true; TRTimeline.init(nodes[i]); }
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", autoInit);
  else autoInit();

  window.TRTimeline = TRTimeline;
})();

import { toFaDigits, formatShort, MONTHS, parseKey } from "./shamsi.js";

/**
 * Monthly line chart.
 * opts.timeOfDay: values are minutes from midnight (0–1440); Y labels as HH:MM
 * opts.skipZero: treat 0 as missing (no point)
 */
export function lineChart(container, points, color = "#E6A817", unitLabel, opts = {}) {
  container.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "chart-wrap";

  const w = 720;
  const h = 280;
  const pad = { l: 52, r: 16, t: 28, b: 40 };
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.setAttribute("class", "chart");
  svg.setAttribute("role", "img");

  const timeOfDay = !!opts.timeOfDay;
  const vals = points.map((p) => {
    const v = Number(p.value);
    if (p.missing || v == null || Number.isNaN(v)) return null;
    if (timeOfDay && v <= 0 && !p.hasValue) return null;
    return v;
  });
  const present = vals.filter((v) => v != null);
  const rawMax = present.length ? Math.max(...present, 0) : 0;
  const rawMin = present.length ? Math.min(...present) : 0;

  let max, min;
  if (timeOfDay) {
    // fixed-ish domain around data, snapped to hours, full day friendly
    min = 0;
    max = 24 * 60; // always show full day scale for readability
  } else {
    min = 0;
    const niceMax = (() => {
      if (rawMax <= 0) return 1;
      const exp = Math.floor(Math.log10(rawMax));
      const f = rawMax / Math.pow(10, exp);
      const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
      return nf * Math.pow(10, exp);
    })();
    max = Math.max(niceMax, 1);
  }

  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const x = (i) => pad.l + (points.length <= 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v) => pad.t + innerH - ((v - min) / (max - min || 1)) * innerH;

  const fmtY = (v) => {
    if (timeOfDay) {
      const total = Math.max(0, Math.min(24 * 60, Math.round(v)));
      const hh = String(Math.floor(total / 60) % 24).padStart(2, "0");
      const mm = String(total % 60).padStart(2, "0");
      return toFaDigits(`${hh}:${mm}`);
    }
    return toFaDigits(String(Math.round(v * 10) / 10));
  };

  const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bg.setAttribute("x", pad.l);
  bg.setAttribute("y", pad.t);
  bg.setAttribute("width", innerW);
  bg.setAttribute("height", innerH);
  bg.setAttribute("fill", "rgba(255,255,255,0.02)");
  bg.setAttribute("rx", "8");
  svg.appendChild(bg);

  const ticks = timeOfDay ? 6 : 4;
  for (let i = 0; i <= ticks; i++) {
    const gv = min + ((max - min) * i) / ticks;
    const gy = y(gv);
    const grid = document.createElementNS("http://www.w3.org/2000/svg", "line");
    grid.setAttribute("x1", pad.l);
    grid.setAttribute("x2", w - pad.r);
    grid.setAttribute("y1", gy);
    grid.setAttribute("y2", gy);
    grid.setAttribute("stroke", "rgba(255,255,255,0.08)");
    grid.setAttribute("stroke-width", "1");
    svg.appendChild(grid);
    const lab = document.createElementNS("http://www.w3.org/2000/svg", "text");
    lab.setAttribute("x", pad.l - 8);
    lab.setAttribute("y", gy + 4);
    lab.setAttribute("text-anchor", "end");
    lab.setAttribute("class", "axis");
    lab.textContent = fmtY(gv);
    svg.appendChild(lab);
  }

  if (points.length) {
    // build path skipping nulls (break segments)
    let d = "";
    let started = false;
    points.forEach((p, i) => {
      const v = vals[i];
      if (v == null) {
        started = false;
        return;
      }
      d += `${started ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)} `;
      started = true;
    });
    if (d) {
      const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
      line.setAttribute("d", d.trim());
      line.setAttribute("fill", "none");
      line.setAttribute("stroke", color);
      line.setAttribute("stroke-width", "2.6");
      line.setAttribute("stroke-linejoin", "round");
      line.setAttribute("stroke-linecap", "round");
      svg.appendChild(line);
    }

    points.forEach((p, i) => {
      const v = vals[i];
      if (v == null) return;
      const cx = x(i);
      const cy = y(v);
      const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      c.setAttribute("cx", cx);
      c.setAttribute("cy", cy);
      c.setAttribute("r", "3.2");
      c.setAttribute("fill", color);
      c.setAttribute("stroke", "#0a0c10");
      c.setAttribute("stroke-width", "1");
      svg.appendChild(c);
      if (points.length <= 16 || i % 2 === 0) {
        const vt = document.createElementNS("http://www.w3.org/2000/svg", "text");
        vt.setAttribute("x", cx);
        vt.setAttribute("y", cy - 8);
        vt.setAttribute("text-anchor", "middle");
        vt.setAttribute("class", "val");
        vt.textContent = timeOfDay ? fmtY(v) : toFaDigits(String(Math.round(v * 10) / 10));
        svg.appendChild(vt);
      }
    });
  }

  // ALL day labels on X
  points.forEach((p, i) => {
    const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
    t.setAttribute("x", x(i));
    t.setAttribute("y", h - 12);
    t.setAttribute("text-anchor", "middle");
    t.setAttribute("class", "axis");
    t.setAttribute("font-size", points.length > 20 ? "8" : "10");
    const jd = parseKey(p.date)?.jd;
    t.textContent = jd != null ? toFaDigits(jd) : toFaDigits(i + 1);
    svg.appendChild(t);
  });

  const yTitle = document.createElementNS("http://www.w3.org/2000/svg", "text");
  yTitle.setAttribute("x", 12);
  yTitle.setAttribute("y", 16);
  yTitle.setAttribute("class", "axis");
  yTitle.textContent = timeOfDay ? "ساعت روز" : "مقدار";
  svg.appendChild(yTitle);

  const xTitle = document.createElementNS("http://www.w3.org/2000/svg", "text");
  xTitle.setAttribute("x", w / 2);
  xTitle.setAttribute("y", h - 2);
  xTitle.setAttribute("text-anchor", "middle");
  xTitle.setAttribute("class", "axis");
  xTitle.textContent = "روز ماه";
  svg.appendChild(xTitle);

  wrap.appendChild(svg);
  const cap = document.createElement("div");
  cap.className = "chart-cap";
  const sum = present.reduce((a, b) => a + b, 0);
  const peak = present.length ? Math.max(...present) : 0;
  if (typeof unitLabel === "function") {
    cap.textContent = unitLabel(sum, max, present);
  } else if (timeOfDay) {
    cap.textContent = present.length
      ? `ثبت‌شده ${toFaDigits(present.length)} روز · بازه ${fmtY(rawMin)} تا ${fmtY(rawMax)}`
      : "داده‌ای برای ساعت شروع نیست";
  } else {
    cap.textContent = `مجموع ${toFaDigits(Math.round(sum * 10) / 10)} · بیشینه ${toFaDigits(Math.round(peak * 10) / 10)}`;
  }
  wrap.appendChild(cap);
  container.appendChild(wrap);
}

export function monthKeys(year, month) {
  const days = [];
  for (let d = 1; d <= 31; d++) days.push(`${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  return days;
}

export { MONTHS, formatShort };

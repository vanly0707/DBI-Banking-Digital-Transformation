/* Digital Banking Index — giao diện tĩnh, đọc window.DBI_DATA do src/scoring.py tạo ra */
(function () {
  "use strict";

  // ====== Sửa tên nhóm ở đây ======
  const TEAM_LABEL = "Nhóm 0X";

  const D = window.DBI_DATA;
  if (!D) { document.body.innerHTML = "<p style='padding:40px'>Không tìm thấy data.js. Hãy chạy <code>python src/scoring.py</code> trước.</p>"; return; }

  const BANKS = D.meta.banks;
  const PILLARS = D.meta.pillars;
  const GROUPS = D.meta.groups;
  const N_CRIT = D.meta.n_criteria;
  const THEMES = Object.freeze({
    Vietcombank:{primary:'#64866A',dark:'#4E6953',soft:'#E3E9E4',border:'#C9D5CB',page:'#FAF8F5',text:'#2D3C30'},
    BIDV:{primary:'#B9954F',dark:'#90743E',soft:'#F2ECDF',border:'#E6DAC1',page:'#FAF8F5',text:'#534324'},
    VietinBank:{primary:'#64839B',dark:'#4E6679',soft:'#E3E9ED',border:'#C9D4DC',page:'#FAF8F5',text:'#2D3B46'},
    MB:{primary:'#B65F66',dark:'#8E4A50',soft:'#F2E2E3',border:'#E5C7C9',page:'#FAF8F5',text:'#522B2E'},
    TPBank:{primary:'#92719B',dark:'#725879',soft:'#EBE5ED',border:'#D9CDDC',page:'#FAF8F5',text:'#423346'}
  });
  const colorOf = b => THEMES[b]?.primary || '#64866A';
  const comparisonColor = b => b === activeBank() ? colorOf(b) : THEMES[b]?.soft || '#E3E9E4';
  function activeBank() { return S.bank !== 'all' ? S.bank : sortedByDbi()[0]; }
  function applyTheme() {
    const theme = THEMES[activeBank()] || THEMES.Vietcombank;
    const vars = {'--brand-900':theme.dark,'--brand-700':theme.primary,'--brand-500':theme.primary,'--accent':theme.primary,'--accent-soft':theme.soft,'--cream':theme.page,'--sand':theme.soft,'--sand-2':theme.border,'--line':theme.border,'--ink':theme.text,'--ink-2':theme.text,'--ink-3':theme.dark,'--theme-primary':theme.primary,'--theme-soft':theme.soft};
    Object.entries(vars).forEach(([k,v])=>document.documentElement.style.setProperty(k,v));
    document.body.dataset.bank = activeBank();
    document.querySelectorAll('.bank-art').forEach(el => el.style.setProperty('--art-color',theme.primary));
    const bg = document.querySelector('.topbar'); if(bg) bg.style.background = theme.page;
    try { sessionStorage.setItem('dbi-selection',JSON.stringify({bank:S.bank,scenario:S.scenario,way:S.way,measure:S.measure})); } catch (_) {}
  }
  function bankLogo(b) { return `<span class="bank-logo" style="--logo-color:${colorOf(b)}" aria-label="${esc(b)}"><span>${esc(mono(b))}</span></span>`; }
  function route(page,params={}) { const q = new URLSearchParams(params); location.href=page+(q.toString()?'?'+q:''); }
  const CRIT = Object.fromEntries(D.criteria.map(c => [c.code, c]));
  const GROUP_BY_ID = Object.fromEntries(GROUPS.map(g => [g.id, g]));
  const CATS = [
    {name:"Khởi đầu",bg:"#E9EDEF",fg:"#34434B"},
    {name:"Cục bộ",bg:"#D8E1E5",fg:"#34434B"},
    {name:"Mở rộng",bg:"#C3D2D8",fg:"#34434B"},
    {name:"Toàn hàng",bg:"#526B78",fg:"#FFFFFF"},
    {name:"Hệ sinh thái",bg:"#34434B",fg:"#FFFFFF"}
  ];

  const DEFAULT = { bank: "all", measure: "pct", scenario: "base", way: "A", rankPillar: "all", heatMode: "pillar" };
  const S = Object.assign({}, DEFAULT, { cmpA: null, cmpB: null, lk: { q: "", bank: "", pillar: "", group: "", level: "" }, page: 0, open: null });

  try {
    const saved=JSON.parse(sessionStorage.getItem('dbi-selection')||'{}');
    Object.keys(DEFAULT).forEach(k=>{if(saved[k]!=null) S[k]=saved[k];});
  } catch (_) {}
  const params = new URLSearchParams(location.search);
  if (params.has('bank') && BANKS.includes(params.get('bank'))) S.bank=params.get('bank');
  if (params.has('q')) S.lk.q=params.get('q');
  if (params.has('pillar')) S.lk.pillar=params.get('pillar');
  if (params.has('group')) S.lk.group=params.get('group');
  if (params.has('lookupBank') && BANKS.includes(params.get('lookupBank'))) S.lk.bank=params.get('lookupBank');
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const nf = (x, d) => x.toLocaleString("vi-VN", { minimumFractionDigits: d, maximumFractionDigits: d });

  // ---------- số liệu
  const sc = () => D.scores[S.way];
  const dbi = b => sc().dbi[S.scenario][b];
  const pil = (b, p) => sc().pillar[b][String(p)];
  const grp = (b, g) => sc().group[b][g];
  const toMeasure = z => S.measure === "pct" ? z : 1 + z / 25;
  const fmt = z => z == null ? "—" : (S.measure === "pct" ? nf(z, 1) : nf(1 + z / 25, 2));
  const unit = () => S.measure === "pct" ? "%" : "/5";
  const axisMax = () => S.measure === "pct" ? 100 : 5;
  const axisMin = () => S.measure === "pct" ? 0 : 1;
  const cat = z => CATS[Math.max(0, Math.min(4, Math.floor(1 + z / 25 + 1e-9) - 1))];
  const mono = b => b.replace(/bank$/i, "").slice(0, 2).toUpperCase();

  function scoreFor(b) { return S.rankPillar === "all" ? dbi(b) : pil(b, S.rankPillar); }
  function rankMap(getter) {
    const vals = BANKS.map(b => [b, getter(b)]).filter(x => x[1] != null);
    const out = {};
    vals.forEach(([b, v]) => { out[b] = 1 + vals.filter(x => Math.round(x[1] * 1e4) > Math.round(v * 1e4)).length; });
    return out;
  }
  const dbiRank = () => sc().rank[S.scenario];
  const sortedByDbi = () => BANKS.slice().sort((a, b) => dbi(b) - dbi(a));

  function heatColor(z) {
    if (z == null) return null;
    const h=THEMES[activeBank()]; const hex=x=>[1,3,5].map(i=>parseInt(x.slice(i,i+2),16));
    const stops = [[0,hex(h.soft)], [50,hex(h.border)], [100,hex(h.dark)]];
    for (let i = 1; i < stops.length; i++) {
      if (z <= stops[i][0]) {
        const [z0, c0] = stops[i - 1], [z1, c1] = stops[i], t = (z - z0) / (z1 - z0);
        return `rgb(${c0.map((c, k) => Math.round(c + (c1[k] - c) * t)).join(",")})`;
      }
    }
    return THEMES[activeBank()].dark;
  }

  // ---------- bộ lọc
  function buildFilters() {
    $("#teamLabel").textContent = TEAM_LABEL;
    $("#footTeam").textContent = TEAM_LABEL;
    $("#footDate").textContent = D.meta.generated.split("-").reverse().join("/");
    $("#heroSub").textContent = `So sánh ${BANKS.length} ngân hàng qua ${N_CRIT} tiêu chí và ${PILLARS.length} trụ cột năng lực số · dữ liệu công khai ${D.meta.period}.`;

    $("#fBank").innerHTML = `<button data-v="all">Tất cả ngân hàng</button>` + BANKS.map(b => `<button data-v="${esc(b)}">${esc(b)}</button>`).join("");
    $("#fScenario").innerHTML = D.meta.scenarios.map(s => `<option value="${s.id}">${esc(s.label)}</option>`).join("");

    segment("#fBank", v => { S.bank = v; render(); });
    segment("#fMeasure", v => { S.measure = v; render(); });
    segment("#fWay", v => { S.way = v; render(); });
    if ($("#heatMode")) segment("#heatMode", v => { S.heatMode = v; renderHeat(); });
    $("#fScenario").addEventListener("change", e => { S.scenario = e.target.value; render(); });
    $("#resetBtn").addEventListener("click", () => {
      Object.assign(S, DEFAULT); S.cmpA = S.cmpB = null; $("#fScenario").value = "base"; render(); if ($("#heat")) renderHeat();
    });

    // so sánh
    const opts = BANKS.map(b => `<option>${esc(b)}</option>`).join("");
    if ($("#cmpA")) { $("#cmpA").innerHTML = opts; $("#cmpB").innerHTML = opts; }
    $("#cmpA")?.addEventListener("change", e => { S.cmpA = e.target.value; renderRadar(); });
    $("#cmpB")?.addEventListener("change", e => { S.cmpB = e.target.value; renderRadar(); });

    if ($("#lkBank")) {
    // tra cứu
    $("#lkBank").innerHTML = `<option value="">Mọi ngân hàng</option>` + opts;
    $("#lkPillar").innerHTML = `<option value="">Mọi trụ cột</option>` + PILLARS.map(p => `<option value="${p.id}">${p.id}. ${esc(p.short)}</option>`).join("");
    fillGroupSelect();
    $("#lkSearch").value = S.lk.q; $("#lkBank").value = S.lk.bank; $("#lkPillar").value=S.lk.pillar; fillGroupSelect();
    $("#lkSearch").addEventListener("input", e => { S.lk.q = e.target.value; S.page = 0; renderLookup(); });
    $("#lkBank").addEventListener("change", e => { S.lk.bank = e.target.value; S.page = 0; renderLookup(); });
    $("#lkPillar").addEventListener("change", e => { S.lk.pillar = e.target.value; S.lk.group = ""; fillGroupSelect(); S.page = 0; renderLookup(); });
    $("#lkGroup").addEventListener("change", e => { S.lk.group = e.target.value; S.page = 0; renderLookup(); });
    $("#lkLevel").addEventListener("change", e => { S.lk.level = e.target.value; S.page = 0; renderLookup(); });
    $("#lkClear").addEventListener("click", () => setLookup({}));
    $("#lkPrev").addEventListener("click", () => { S.page--; renderLookup(); });
    $("#lkNext").addEventListener("click", () => { S.page++; renderLookup(); });

    $("#exportLookup")?.addEventListener("click", exportLookup);
    }
    $("#exportBtn")?.addEventListener("click", exportSummary);
    $("#helpBtn").addEventListener("click", () => $("#help").classList.add("open"));
    $("#helpClose").addEventListener("click", () => $("#help").classList.remove("open"));
    $("#help").addEventListener("click", e => { if (e.target.id === "help") e.currentTarget.classList.remove("open"); });

    $("#globalSearch").addEventListener("keydown", e => {
      if (e.key !== "Enter") return;
      const q = e.target.value.trim(); if (!q) return;
      const hit = BANKS.find(b => b.toLowerCase() === q.toLowerCase()) || BANKS.find(b => b.toLowerCase().includes(q.toLowerCase()));
      if (hit) { S.bank = hit; applyTheme(); route("index.html",{bank:hit}); }
      else { route("tra-cuu.html",{q}); }
    });
  }

  function fillGroupSelect() {
    const gs = GROUPS.filter(g => !S.lk.pillar || String(g.pillar) === String(S.lk.pillar));
    $("#lkGroup").innerHTML = `<option value="">Mọi nhóm</option>` + gs.map(g => `<option value="${g.id}">${g.id} ${esc(g.name)}</option>`).join("");
    $("#lkGroup").value = S.lk.group;
  }

  function segment(sel, onPick) {
    $(sel).addEventListener("click", e => {
      const b = e.target.closest("button[data-v]"); if (!b) return;
      onPick(b.dataset.v);
    });
  }
  function syncSeg(sel, v) { document.querySelectorAll(`${sel} button`).forEach(b => b.classList.toggle("on", b.dataset.v === v)); }
  function jump(sel) {
    const page={'#tra-cuu':'tra-cuu.html','#so-sanh':'so-sanh.html','#xep-hang':'xep-hang.html','#phuong-phap':'phuong-phap.html'}[sel];
    if (page) { route(page); return; }
    document.querySelector(sel)?.scrollIntoView({behavior:'smooth',block:'start'});
  }
  function flash(sel) { const el = $(sel); if (!el) return; el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash"); }

  function setLookup(o) {
    S.lk = Object.assign({ q: "", bank: "", pillar: "", group: "", level: "" }, o);
    S.page = 0; S.open = null;
    $("#lkSearch").value = S.lk.q; $("#lkBank").value = S.lk.bank; $("#lkPillar").value = S.lk.pillar;
    fillGroupSelect(); $("#lkLevel").value = S.lk.level;
    renderLookup();
  }

  // ---------- KPI
  function renderKpis() {
    const sel = S.bank !== "all";
    const banks = sel ? [S.bank] : BANKS;
    const avg = banks.reduce((s, b) => s + dbi(b), 0) / banks.length;
    const covered = banks.reduce((s, b) => s + D.coverage[b].total, 0);
    const total = banks.length * N_CRIT;
    const best = sel ? PILLARS.slice().sort((a, b) => (pil(S.bank, b.id) ?? -1) - (pil(S.bank, a.id) ?? -1))[0] : null;
    const pctBar = z => `<div class="k-bar"><i style="width:${Math.max(0, Math.min(100, z))}%"></i></div>`;
    $("#kpis").innerHTML = [
      `<div class="card kpi"><div class="k-top">${sel ? "Điểm DBI" : "Điểm trung bình"}<span class="k-ic">◷</span></div>
        <div class="k-val tnum">${fmt(avg)}<small>${unit()}</small></div>
        <div class="k-note">${sel ? `Hạng ${dbiRank()[S.bank]} / ${BANKS.length}` : `Trung bình ${BANKS.length} ngân hàng`}</div>${pctBar(avg)}</div>`,
      `<div class="card kpi"><div class="k-top">Bản ghi đánh giá<span class="k-ic">▦</span></div>
        <div class="k-val tnum">${nf(total, 0)}<small>bản ghi</small></div>
        <div class="k-note">${N_CRIT} tiêu chí × ${banks.length} ngân hàng</div></div>`,
      `<div class="card kpi"><div class="k-top">Độ phủ bằng chứng<span class="k-ic">✓</span></div>
        <div class="k-val tnum">${nf(covered / total * 100, 1)}<small>%</small></div>
        <div class="k-note">${covered} / ${total} bản ghi có mức (không N/A)</div>${pctBar(covered / total * 100)}</div>`,
      sel
        ? `<div class="card kpi"><div class="k-top">Trụ cột mạnh nhất<span class="k-ic">↗</span></div>
           <div class="k-val" style="font-size:28px">${esc(best.short)}</div>
           <div class="k-note">${fmt(pil(S.bank, best.id))}${unit()} · ${D.coverage[S.bank].pillar[best.id]}/${best.n} tiêu chí có mức</div></div>`
        : `<div class="card kpi"><div class="k-top">Phạm vi so sánh<span class="k-ic">↗</span></div>
           <div class="k-val tnum">${BANKS.length}<small>ngân hàng</small></div>
           <div class="k-note">${PILLARS.length} trụ cột · ${GROUPS.length} nhóm · ${D.meta.period}</div></div>`,
    ].join("");
  }

  // ---------- thẻ ngân hàng
  function renderTop() {
    const order = sortedByDbi();
    const focus = S.bank !== "all" ? S.bank : order[0];
    const r = dbiRank()[focus];
    const scenLabel = D.meta.scenarios.find(s => s.id === S.scenario).label;
    $("#topBank").innerHTML = `
      <div class="tb-head"><div><div class="tb-name">${bankLogo(focus)} ${esc(focus)}</div><div class="tb-meta">${PILLARS.length} trụ cột · ${esc(scenLabel)} · Cách ${S.way}</div></div>
        <span class="badge-rank">HẠNG ${r} / ${BANKS.length}</span></div>
      <div class="tb-score"><b class="tnum">${fmt(dbi(focus))}</b><span>${unit()} · Điểm năng lực số (DBI)</span></div>
      <div class="bars">${order.map(b => `<div class="bar-row ${b === focus ? "me" : ""}"><span>${esc(b)}</span>
        <span class="track"><i style="width:${dbi(b)}%"></i></span><span class="v">${fmt(dbi(b))}</span></div>`).join("")}</div>
      <div class="axis"><span></span><div>${[0, 25, 50, 75, 100].map(z => `<span>${S.measure === "pct" ? z : nf(1 + z / 25, 0)}</span>`).join("")}</div><span></span></div>`;

    const pv = PILLARS.map(p => ({ p, v: pil(focus, p.id) })).filter(x => x.v != null).sort((a, b) => b.v - a.v);
    const hi = pv[0], lo = pv[pv.length - 1];
    const recs = D.records.filter(x => x.bank === focus);
    const strong = recs.filter(x => x.level >= 4).length;
    const cov = D.coverage[focus].total;
    $("#profile").innerHTML = `
      <div class="pf-visual bank-art" role="img" aria-label="Hình minh họa nhận diện ${esc(focus)}"><span class="pf-mono">${bankLogo(focus)}</span>
        <div class="pf-chips"><span class="pf-chip">✦ ${PILLARS.length} trụ cột</span><span class="pf-chip">▦ ${N_CRIT} tiêu chí</span></div></div>
      <h3>Khám phá hồ sơ ${esc(focus)}</h3>
      <p>Hồ sơ năng lực số qua ${PILLARS.length} trụ cột, dựa trên minh chứng công khai ${D.meta.period}.</p>
      <div class="pf-stats">
        <div class="pf-stat"><span>Trụ cột nổi bật</span><b>${esc(hi.p.short)} · ${fmt(hi.v)}${unit()}</b></div>
        <div class="pf-stat"><span>Trụ cột thấp nhất</span><b>${esc(lo.p.short)} · ${fmt(lo.v)}${unit()}</b></div>
        <div class="pf-stat"><span>Độ phủ</span><b>${nf(cov / N_CRIT * 100, 1)}% · ${cov}/${N_CRIT}</b></div>
        <div class="pf-stat"><span>Tiêu chí mức 4–5</span><b>${strong} tiêu chí</b></div>
      </div>
      <div class="note">ⓘ Kết quả sơ bộ · cần đối chiếu nguồn và số trang.</div>
      <div class="links"><button class="btn btn-primary" data-act="evidence">Đối chiếu bằng chứng ↗</button><button class="btn" data-act="compare">So sánh ↗</button></div>`;
    $("#profile").onclick = e => {
      const a = e.target.closest("[data-act]"); if (!a) return;
      if (a.dataset.act === "evidence") route("tra-cuu.html",{lookupBank:focus});
      else route("so-sanh.html",{bank:focus});
    };
  }

  // ---------- xếp hạng
  function renderRanking() {
    $("#rankTabs").innerHTML = [`<button data-v="all" class="${S.rankPillar === "all" ? "on" : ""}">Tất cả trụ cột</button>`]
      .concat(PILLARS.map(p => `<button data-v="${p.id}" class="${String(S.rankPillar) === String(p.id) ? "on" : ""}">${esc(p.short)}</button>`)).join("");
    const isAll = S.rankPillar === "all";
    const ranks = isAll ? dbiRank() : rankMap(b => pil(b, S.rankPillar));
    const p = isAll ? null : PILLARS.find(x => String(x.id) === String(S.rankPillar));
    $("#rankSub").textContent = isAll ? `Điểm DBI có trọng số · ${D.meta.scenarios.find(s => s.id === S.scenario).label} · Cách ${S.way}` : `Điểm trụ cột ${p.short} · ${p.n} tiêu chí`;
    $("#rankScoreTh").textContent = `Điểm (${unit()})`;
    const rows = BANKS.slice().sort((a, b) => (scoreFor(b) ?? -1) - (scoreFor(a) ?? -1));
    $("#rankBody").innerHTML = rows.map(b => {
      const z = scoreFor(b), c = z == null ? null : cat(z);
      const cv = isAll ? D.coverage[b].total : D.coverage[b].pillar[S.rankPillar];
      const n = isAll ? N_CRIT : p.n;
      return `<tr data-b="${esc(b)}" class="${S.bank === b ? "sel" : ""}">
        <td class="r-no">${String(ranks[b] ?? "–").padStart(2, "0")}</td>
        <td><span class="r-bank">${bankLogo(b)}${esc(b)}</span></td>
        <td class="r-score">${fmt(z)}</td>
        <td class="hide-sm"><div class="mini"><i style="width:${z ?? 0}%;background:${comparisonColor(b)}"></i></div></td>
        <td class="hide-sm cov">${cv}/${n} có mức</td>
        <td>${c ? `<span class="tag" style="background:${c.bg};color:${c.fg}">${c.name}</span>` : "—"}</td></tr>`;
    }).join("");
  }

  // ---------- radar
  let radarChart, scnChart;
  function renderRadar() {
    const order = sortedByDbi();
    if (!S.cmpA) S.cmpA = S.bank !== "all" ? S.bank : order[0];
    if (!S.cmpB || S.cmpB === S.cmpA) S.cmpB = order.find(b => b !== S.cmpA);
    $("#cmpA").value = S.cmpA; $("#cmpB").value = S.cmpB;
    const ds = [S.cmpA, S.cmpB].map((b, i) => ({
      label: b, data: PILLARS.map(p => { const v = pil(b, p.id); return v == null ? null : +toMeasure(v).toFixed(2); }),
      borderColor: comparisonColor(b), backgroundColor: comparisonColor(b) + "33", pointBackgroundColor: comparisonColor(b), borderWidth: 2, pointRadius: 3,
    }));
    const cfg = {
      type: "radar", data: { labels: PILLARS.map(p => p.short), datasets: ds },
      options: {
        maintainAspectRatio: false, animation: { duration: 400 },
        scales: { r: { min: axisMin(), max: axisMax(), ticks: { stepSize: S.measure === "pct" ? 20 : 1, backdropColor: "transparent", color: "#8E766C", font: { size: 10 } },
          grid: { color: "#EFDFD3" }, angleLines: { color: "#EFDFD3" }, pointLabels: { color: "#5C4740", font: { size: 12, weight: "600", family: "Be Vietnam Pro" } } } },
        plugins: { legend: { position: "bottom", labels: { usePointStyle: true, color: "#5C4740", font: { family: "Be Vietnam Pro" } } },
          tooltip: { callbacks: { label: c => `${c.dataset.label}: ${S.measure === "pct" ? nf(c.raw, 1) + "%" : nf(c.raw, 2) + "/5"}` } } },
      },
    };
    if (window.Chart) { if (radarChart) radarChart.destroy(); radarChart = new Chart($("#radar"), cfg); }
    const a = S.cmpA, b = S.cmpB;
    const best = PILLARS.slice().sort((x, y) => (pil(a, y.id) ?? -1) - (pil(a, x.id) ?? -1))[0];
    const diffs = PILLARS.map(p => ({ p, d: (pil(a, p.id) ?? 0) - (pil(b, p.id) ?? 0) })).sort((x, y) => Math.abs(y.d) - Math.abs(x.d));
    const big = diffs[0];
    const dTxt = S.measure === "pct" ? `${nf(Math.abs(big.d), 1)} điểm %` : `${nf(Math.abs(big.d) / 25, 2)} mức`;
    $("#radarInsight").innerHTML = `<span>↗</span><span><b>${esc(a)}</b> mạnh nhất ở trụ cột <b>${esc(best.short)}</b>. Hai ngân hàng chênh nhiều nhất ở <b>${esc(big.p.short)}</b> (${dTxt}, ${big.d >= 0 ? esc(a) : esc(b)} cao hơn).</span>`;
  }

  // ---------- khoảng cách
  function renderGap() {
    const rows = PILLARS.map(p => {
      const vals = BANKS.map(b => ({ b, v: pil(b, p.id) })).filter(x => x.v != null);
      const mx = vals.reduce((m, x) => x.v > m.v ? x : m, vals[0]);
      const mn = vals.reduce((m, x) => x.v < m.v ? x : m, vals[0]);
      return { p, vals, mx, mn, gap: mx.v - mn.v };
    }).sort((a, b) => b.gap - a.gap);
    const g = v => S.measure === "pct" ? nf(v, 1) : nf(v / 25, 2);
    $("#gap").innerHTML = rows.map(r => `<div class="gap-row"><span>${esc(r.p.short)}</span>
      <div class="gap-track"><span class="gap-seg" style="left:${r.mn.v}%;width:${r.gap}%"></span>
      ${r.vals.map(x => `<span class="gap-dot" title="${esc(x.b)}: ${fmt(x.v)}${unit()}" style="left:${x.v}%;background:${comparisonColor(x.b)}">${esc(mono(x.b))}</span>`).join("")}</div>
      <span class="gap-v">${g(r.gap)}</span></div>`).join("") +
      `<div class="axis" style="grid-template-columns:110px 1fr 56px;color:var(--ink-3);opacity:1"><span></span><div>${[0, 25, 50, 75, 100].map(z => `<span>${S.measure === "pct" ? z : nf(1 + z / 25, 0)}</span>`).join("")}</div><span></span></div>`;
    const t = rows[0];
    $("#gapInsight").innerHTML = `<span>✧</span><span><b>${esc(t.p.short)}</b> có khoảng cách lớn nhất: ${g(t.gap)} ${S.measure === "pct" ? "điểm %" : "mức"}, giữa <b>${esc(t.mx.b)}</b> và <b>${esc(t.mn.b)}</b>. Nhỏ nhất là ${esc(rows[rows.length - 1].p.short)} (${g(rows[rows.length - 1].gap)}).</span>`;
  }

  // ---------- heatmap
  function renderHeat() {
    syncSeg("#heatMode", S.heatMode);
    const isP = S.heatMode === "pillar";
    const cols = isP ? PILLARS.map(p => ({ id: String(p.id), label: p.short, title: p.name }))
                     : GROUPS.map(g => ({ id: g.id, label: g.id, title: `${g.id} ${g.name}` }));
    const get = (b, c) => isP ? pil(b, c.id) : grp(b, c.id);
    const cell = (b, c) => {
      const z = get(b, c);
      if (z == null) return `<td><div class="cell na" data-b="${esc(b)}" data-c="${c.id}" title="${esc(b)} · ${esc(c.title)}: toàn bộ N/A">–</div></td>`;
      const fg = z > 55 ? "#FFFFFF" : THEMES[activeBank()].text;
      return `<td><div class="cell" data-b="${esc(b)}" data-c="${c.id}" title="${esc(b)} · ${esc(c.title)}: ${fmt(z)}${unit()}" style="background:${heatColor(z)};color:${fg}">${isP ? fmt(z) : (S.measure === "pct" ? Math.round(z) : nf(1 + z / 25, 1))}</div></td>`;
    };
    const head = isP ? cols.map(c => `<th title="${esc(c.title)}">${esc(c.label)}</th>`).join("")
                     : cols.map(c => `<th class="gh" title="${esc(c.title)}">${esc(c.title.length > 30 ? c.title.slice(0, 29) + "…" : c.title)}</th>`).join("");
    const rows = (S.bank !== "all" ? [S.bank] : sortedByDbi());
    $("#heat").className = "heat" + (isP ? "" : " groups");
    $("#heat").innerHTML = `<table><thead><tr><th>Ngân hàng</th>${head}</tr></thead><tbody>${rows.map(b => `<tr><td>${esc(b)}</td>${cols.map(c => cell(b, c)).join("")}</tr>`).join("")}</tbody></table>`;
    $("#heat").onclick = e => {
      const c = e.target.closest(".cell"); if (!c) return;
      if (isP) setLookup({ bank: c.dataset.b, pillar: c.dataset.c });
      else setLookup({ bank: c.dataset.b, pillar: String(GROUP_BY_ID[c.dataset.c].pillar), group: c.dataset.c });
      route("tra-cuu.html", {lookupBank:c.dataset.b,pillar:isP?c.dataset.c:GROUP_BY_ID[c.dataset.c].pillar,group:isP?"":c.dataset.c});
    };
  }

  // ---------- biểu đồ kịch bản
  function renderScenario() {
    const shades = [colorOf(activeBank()), THEMES[activeBank()].dark, THEMES[activeBank()].soft, THEMES[activeBank()].border];
    const order = sortedByDbi();
    $("#scnSub").textContent = `So sánh kịch bản cơ sở với S1–S3 · Cách ${S.way} · thước đo ${S.measure === "pct" ? "%" : "/5"}`;
    const cfg = {
      type: "bar",
      data: { labels: order, datasets: D.meta.scenarios.map((s, i) => ({ label: s.label, data: order.map(b => +toMeasure(sc().dbi[s.id][b]).toFixed(2)), backgroundColor: shades[i % 4], borderRadius: 6, maxBarThickness: 26 })) },
      options: {
        maintainAspectRatio: false, animation: { duration: 400 },
        scales: { y: { min: S.measure === "pct" ? 0 : 1, max: axisMax(), grid: { color: "#F3E6DC" }, ticks: { color: "#8E766C" } }, x: { grid: { display: false }, ticks: { color: "#5C4740", font: { weight: "600" } } } },
        plugins: { legend: { position: "bottom", labels: { usePointStyle: true, color: "#5C4740" } },
          tooltip: { callbacks: { label: c => `${c.dataset.label}: ${S.measure === "pct" ? nf(c.raw, 1) + "%" : nf(c.raw, 2) + "/5"}` } } },
      },
    };
    if (window.Chart) { if (scnChart) scnChart.destroy(); scnChart = new Chart($("#scnChart"), cfg); }
  }

  // ---------- tra cứu
  function filteredRecords() {
    const q = S.lk.q.trim().toLowerCase();
    return D.records.filter(r => {
      const c = CRIT[r.code];
      if (S.lk.bank && r.bank !== S.lk.bank) return false;
      if (S.lk.pillar && String(c.pillar) !== String(S.lk.pillar)) return false;
      if (S.lk.group && c.group !== S.lk.group) return false;
      if (S.lk.level === "na" && r.level != null) return false;
      if (S.lk.level && S.lk.level !== "na" && String(r.level) !== S.lk.level) return false;
      if (q && !(`${r.code} ${c.name} ${r.evidence} ${r.source} ${r.bank}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }
  const PER = 20;
  function lvBadge(l) {
    if (l == null) return `<span class="lv na">N/A</span>`;
    const c = cat((l - 1) * 25);
    return `<span class="lv" style="background:${c.bg};color:${c.fg}">${l}</span>`;
  }
  function renderLookup() {
    const rows = filteredRecords();
    const pages = Math.max(1, Math.ceil(rows.length / PER));
    S.page = Math.max(0, Math.min(S.page, pages - 1));
    const slice = rows.slice(S.page * PER, S.page * PER + PER);
    $("#lkBody").innerHTML = slice.length ? slice.map(r => {
      const c = CRIT[r.code], key = r.bank + "|" + r.code, open = S.open === key;
      return `<tr class="row" data-k="${esc(key)}"><td class="code">${esc(r.code)}</td><td style="min-width:150px"><b>${esc(c.name)}</b></td>
        <td>${esc(r.bank)}</td><td>${lvBadge(r.level)}</td><td style="min-width:260px"><span class="${open ? "" : "clamp"}">${esc(r.evidence) || "—"}</span></td>
        <td class="hide-sm" style="min-width:160px"><span class="${open ? "" : "clamp"}">${esc(r.source) || "—"}</span></td><td class="hide-sm">${esc(r.page) || "—"}</td><td class="hide-sm">${esc(r.year) || "—"}</td></tr>` +
        (open ? `<tr class="detail"><td colspan="8"><b>${esc(r.code)} ${esc(c.name)}</b> · ${esc(GROUP_BY_ID[c.group]?.name || "")}
          <div class="lvl-list">${c.levels.map((t, i) => `<div class="lvl-item ${r.level === i + 1 ? "hit" : ""}"><b>Mức ${i + 1}${r.level === i + 1 ? " · đang chấm" : ""}</b>${esc(t)}</div>`).join("")}</div></td></tr>` : "");
    }).join("") : `<tr><td colspan="8" class="empty">Không có bản ghi phù hợp bộ lọc.</td></tr>`;
    const na = rows.filter(r => r.level == null).length;
    $("#lkInfo").textContent = `${rows.length} bản ghi · ${na} N/A · trang ${S.page + 1}/${pages}`;
    $("#lkPrev").disabled = S.page === 0; $("#lkNext").disabled = S.page >= pages - 1;
    $("#lkBody").onclick = e => {
      const tr = e.target.closest("tr.row"); if (!tr) return;
      S.open = S.open === tr.dataset.k ? null : tr.dataset.k; renderLookup();
    };
  }

  // ---------- phương pháp & độ vững
  function renderMethod() {
    $("#wTable").innerHTML = `<thead><tr><th>Kịch bản</th>${PILLARS.map(p => `<th>${esc(p.short)}</th>`).join("")}</tr></thead><tbody>` +
      D.meta.scenarios.map(s => {
        const tot = Object.values(s.weights).reduce((a, b) => a + b, 0);
        return `<tr><td><b>${esc(s.id === "base" ? "Cơ sở" : s.id)}</b></td>${PILLARS.map(p => `<td class="tnum">${nf(s.weights[p.id] / tot * 100, 1)}%</td>`).join("")}</tr>`;
      }).join("") + "</tbody>";
    $("#robustTable").innerHTML = `<thead><tr><th>Phương án</th><th>Spearman ρ</th><th>Đổi hạng</th></tr></thead><tbody>` +
      D.robustness.filter(r => !(r.way === "A" && r.scenario === "base")).map(r =>
        `<tr><td>Cách ${r.way} · ${esc(r.label)}</td><td class="rho">${nf(r.rho, 3)}</td><td>${r.changed.length ? esc(r.changed.join(", ")) : "Không đổi"}</td></tr>`).join("") + "</tbody>";
    const ramp = [THEMES[activeBank()].dark, THEMES[activeBank()].primary, THEMES[activeBank()].border, THEMES[activeBank()].soft, "#FFFFFF"];
    $("#dirSub").textContent = `${nf(D.dirichlet.runs, 0)} lần rút trọng số ngẫu nhiên (Dirichlet) · Cách A · xác suất mỗi ngân hàng đứng từng hạng`;
    $("#dirichlet").innerHTML = sortedByDbiA().map(b => `<div class="stack-row"><span><b>${esc(b)}</b></span><div class="stack">${D.dirichlet.prob[b].map((p, i) =>
      p > 0 ? `<i title="Hạng ${i + 1}: ${nf(p * 100, 1)}%" style="width:${p * 100}%;background:${ramp[i]}"></i>` : "").join("")}</div></div>`).join("");
    $("#dirLegend").innerHTML = BANKS.map((_, i) => `<span><i style="background:${ramp[i]};border:1px solid var(--line)"></i>Hạng ${i + 1}</span>`).join("");
  }
  const sortedByDbiA = () => BANKS.slice().sort((a, b) => D.scores.A.dbi.base[b] - D.scores.A.dbi.base[a]);

  // ---------- xuất CSV
  function download(name, rows) {
    const csv = "﻿" + rows.map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function exportSummary() {
    const head = ["Hạng", "Ngân hàng", "DBI (0-100)", ...PILLARS.map(p => p.short), "Độ phủ", "Kịch bản", "Cách"];
    const rows = sortedByDbi().map(b => [dbiRank()[b], b, dbi(b), ...PILLARS.map(p => pil(b, p.id)), `${D.coverage[b].total}/${N_CRIT}`, S.scenario, S.way]);
    download(`DBI_xep_hang_${S.scenario}_${S.way}.csv`, [head, ...rows]);
  }
  function exportLookup() {
    const head = ["Ngân hàng", "Mã", "Tiêu chí", "Trụ cột", "Nhóm", "Level", "Minh chứng", "Nguồn", "Trang", "Năm"];
    const rows = filteredRecords().map(r => { const c = CRIT[r.code]; return [r.bank, r.code, c.name, c.pillar, c.group, r.level ?? "N/A", r.evidence, r.source, r.page, r.year]; });
    download("DBI_minh_chung.csv", [head, ...rows]);
  }

  // ---------- render tổng
  function renderSummary() {
    const s = D.meta.scenarios.find(x => x.id === S.scenario).label;
    $("#fSummary").innerHTML = `<b>${S.bank === "all" ? `Tất cả ${BANKS.length} ngân hàng` : esc(S.bank)}</b> · Tất cả ${PILLARS.length} trụ cột · ${esc(s)} · <b>Cách ${S.way}</b> ${S.way === "A" ? "(bỏ N/A)" : "(N/A = Mức 1)"} · Thước đo ${S.measure === "pct" ? "Digital Score %" : "mức trung bình /5"}`;
  }
  function render() {
    applyTheme();
    syncSeg("#fBank", S.bank); syncSeg("#fMeasure", S.measure); syncSeg("#fWay", S.way);
    $("#fScenario").value = S.scenario;
    renderSummary();
    if ($("#kpis")) renderKpis();
    if ($("#topBank")) renderTop();
    if ($("#rankBody")) renderRanking();
    if ($("#radar")) renderRadar();
    if ($("#gap")) renderGap();
    if ($("#heat")) renderHeat();
    if ($("#scnChart")) renderScenario();
    if ($("#wTable")) renderMethod();
  }

  $("#rankTabs")?.addEventListener("click", e => { const b = e.target.closest("button[data-v]"); if (!b) return; S.rankPillar = b.dataset.v; renderRanking(); });
  $("#rankBody")?.addEventListener("click", e => {
    const tr = e.target.closest("tr[data-b]"); if (!tr) return;
    S.bank = tr.dataset.b; applyTheme(); route("index.html",{bank:S.bank});
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape") $("#help").classList.remove("open"); });

  buildFilters();
  render();
  if ($("#lkBody")) renderLookup();
})();

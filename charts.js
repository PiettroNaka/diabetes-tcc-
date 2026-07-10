// ============================================================
// CHARTS.JS — renderização de todos os gráficos do dashboard
// ============================================================

// Paleta Okabe-Ito — segura para daltonismo (deuteranopia/protanopia/tritanopia)
const PALETTE = {
  blue:   '#0072B2', // azul
  red:    '#D55E00', // vermelhão (distinguível de verde no daltonismo)
  green:  '#009E73', // verde-azulado
  amber:  '#E69F00', // laranja
  purple: '#CC79A7', // roxo-rosado
  teal:   '#56B4E9', // azul-céu
  gray:   '#999999',
  navy:   '#0f172a',
};
// cores por região (Okabe-Ito) — reutilizadas em vários gráficos e no mapa
const REGION_COLORS = { N:'#56B4E9', NE:'#E69F00', CO:'#CC79A7', SE:'#0072B2', S:'#009E73' };

const GRID_COLOR  = 'rgba(0,0,0,.06)';
const TICK_COLOR  = '#64748b';

// ─────────────────────────────────────────────────────────────
// FILTROS — helpers lidos por todos os renderizadores
// ─────────────────────────────────────────────────────────────
function F() { return (typeof window !== 'undefined' && window.FILTERS) ? window.FILTERS : { year:'all', region:'all', sex:'all', age:'all' }; }
// índices dos estados conforme a região selecionada
function stIdx() {
  const d = DATA.estadosPrevalencia, r = F().region;
  return d.estados.map((_, i) => i).filter(i => r === 'all' || d.regiao[i] === r);
}
// índices de uma série temporal ATÉ o ano selecionado (inclusive)
function yrIdx(years) {
  const y = F().year;
  return years.map((_, i) => i).filter(i => y === 'all' || years[i] <= +y);
}
// aplica filtro de ano a labels + N séries; retorna { labels, series:[...] }
function cutTS(years, ...series) {
  const idx = yrIdx(years);
  return { labels: idx.map(i => years[i]), series: series.map(s => idx.map(i => s[i])) };
}

// ─────────────────────────────────────────────────────────────
// FUNÇÕES ESTATÍSTICAS
// ─────────────────────────────────────────────────────────────
const Stats = {
  mean: a => a.reduce((s,v)=>s+v,0) / a.length,
  median: a => {
    const s = [...a].sort((x,y)=>x-y), m = Math.floor(s.length/2);
    return s.length % 2 ? s[m] : (s[m-1]+s[m])/2;
  },
  std: a => {
    const m = Stats.mean(a);
    return Math.sqrt(a.reduce((s,v)=>s+(v-m)**2,0) / (a.length-1));
  },
  min: a => Math.min(...a),
  max: a => Math.max(...a),
  cv: a => (Stats.std(a) / Stats.mean(a)) * 100,
  pearson: (x,y) => {
    const n = x.length, mx = Stats.mean(x), my = Stats.mean(y);
    let num=0, dx=0, dy=0;
    for (let i=0;i<n;i++){ const a=x[i]-mx, b=y[i]-my; num+=a*b; dx+=a*a; dy+=b*b; }
    return num / Math.sqrt(dx*dy);
  },
  // Regressão linear OLS → { slope, intercept, r2, predict }
  linreg: (x,y) => {
    const n = x.length, mx = Stats.mean(x), my = Stats.mean(y);
    let num=0, den=0;
    for (let i=0;i<n;i++){ num += (x[i]-mx)*(y[i]-my); den += (x[i]-mx)**2; }
    const slope = num/den, intercept = my - slope*mx;
    const r = Stats.pearson(x,y);
    return { slope, intercept, r2: r*r, predict: xv => slope*xv + intercept };
  },
  // IC 95% do coeficiente de correlação (transformação z de Fisher)
  corrCI: (r, n) => {
    if (n < 4) return [NaN, NaN];
    const z = Math.atanh(r), se = 1 / Math.sqrt(n - 3);
    return [Math.tanh(z - 1.96 * se), Math.tanh(z + 1.96 * se)];
  },
  // p-valor bicaudal do r (teste t, df = n-2)
  corrP: (r, n) => {
    const df = n - 2;
    if (df <= 0 || Math.abs(r) >= 1) return 0;
    const t = r * Math.sqrt(df / (1 - r * r));
    return _tTwoSidedP(t, df);
  },
};

// ── Regressão linear MÚLTIPLA (equações normais) + LOOCV ─────────────────
function _solveLin(A, b) {
  const n = A.length, M = A.map((r, i) => r.concat([b[i]]));
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    const piv = M[c][c];
    for (let j = c; j <= n; j++) M[c][j] /= piv;
    for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c]; for (let j = c; j <= n; j++) M[r][j] -= f * M[c][j]; }
  }
  return M.map(r => r[n]);
}
function olsMulti(X, y) {
  const n = X.length, p = X[0].length + 1;
  const Xi = X.map(r => [1, ...r]);
  const XtX = Array.from({ length: p }, () => Array(p).fill(0)), Xty = Array(p).fill(0);
  for (let i = 0; i < n; i++) for (let a = 0; a < p; a++) { Xty[a] += Xi[i][a] * y[i]; for (let b = 0; b < p; b++) XtX[a][b] += Xi[i][a] * Xi[i][b]; }
  const beta = _solveLin(XtX, Xty);
  const yhat = Xi.map(r => r.reduce((s, v, j) => s + v * beta[j], 0));
  const ybar = y.reduce((s, v) => s + v, 0) / n;
  let ssr = 0, sst = 0;
  for (let i = 0; i < n; i++) { ssr += (y[i] - yhat[i]) ** 2; sst += (y[i] - ybar) ** 2; }
  const r2 = 1 - ssr / sst;
  return { beta, yhat, r2, adj: 1 - (1 - r2) * (n - 1) / (n - p) };
}
function loocvRMSE(X, y) {
  const n = X.length; let se = 0;
  for (let k = 0; k < n; k++) {
    const Xtr = X.filter((_, i) => i !== k), ytr = y.filter((_, i) => i !== k);
    const m = olsMulti(Xtr, ytr);
    const pred = [1, ...X[k]].reduce((s, v, j) => s + v * m.beta[j], 0);
    se += (y[k] - pred) ** 2;
  }
  return Math.sqrt(se / n);
}

// ── Distribuição t: p-valor via função beta incompleta regularizada ──────
function _logGamma(x) {
  const c = [76.18009172947146,-86.50532032941677,24.01409824083091,-1.231739572450155,0.1208650973866179e-2,-0.5395239384953e-5];
  let y = x, tmp = x + 5.5; tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) ser += c[j] / ++y;
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}
function _betacf(a, b, x) {
  const FPMIN = 1e-300, EPS = 3e-12; let qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - qab * x / qap; if (Math.abs(d) < FPMIN) d = FPMIN; d = 1 / d; let h = d;
  for (let m = 1; m <= 200; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN; d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN; d = 1 / d;
    const del = d * c; h *= del; if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}
function _ibeta(x, a, b) {
  if (x <= 0) return 0; if (x >= 1) return 1;
  const bt = Math.exp(_logGamma(a + b) - _logGamma(a) - _logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? bt * _betacf(a, b, x) / a : 1 - bt * _betacf(b, a, 1 - x) / b;
}
function _tTwoSidedP(t, df) {
  if (!isFinite(t)) return 0;
  return _ibeta(df / (df + t * t), df / 2, 0.5);
}
// formata p-valor para exibição
function fmtP(p) { return p < 0.001 ? 'p < 0,001' : 'p = ' + p.toFixed(3).replace('.', ','); }
// rótulo completo de correlação (r, IC95%, p, n) com proteção p/ amostra pequena
function corrLabel(r, n) {
  if (!isFinite(r) || n < 3) return `amostra insuficiente (n = ${n})`;
  const ci = Stats.corrCI(r, n);
  const ciTxt = isFinite(ci[0]) ? `IC95% [${ci[0].toFixed(2)}; ${ci[1].toFixed(2)}]` : 'IC95% n/d';
  return `r = ${r.toFixed(3)} · ${ciTxt} · ${fmtP(Stats.corrP(r, n))} · n = ${n}`;
}

function baseOpts(legendOpts) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: legendOpts || { display: false },
      tooltip: {
        backgroundColor: 'rgba(15,23,42,.92)',
        titleColor: '#fff',
        bodyColor: '#cbd5e1',
        borderColor: 'rgba(255,255,255,.1)',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 6,
      },
    },
    scales: {
      x: {
        grid: { color: GRID_COLOR },
        ticks: { color: TICK_COLOR, font: { size: 11 } },
      },
      y: {
        grid: { color: GRID_COLOR },
        ticks: { color: TICK_COLOR, font: { size: 11 } },
      },
    },
  };
}

function makeLegend(containerId, items) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = items.map(it =>
    `<span style="display:flex;align-items:center;gap:4px;">
      <span style="width:10px;height:10px;border-radius:2px;background:${it.color};display:inline-block;"></span>
      <span style="font-size:11.5px;color:#475569;">${it.label}</span>
    </span>`
  ).join('');
}

// ── Registra todos os gráficos ──────────────────────────────
let _charts = {};
function destroyChart(id) {
  if (_charts[id]) { _charts[id].destroy(); delete _charts[id]; }
}
function saveChart(id, instance) {
  _charts[id] = instance;
}

// ─────────────────────────────────────────────────────────────
// OVERVIEW
// ─────────────────────────────────────────────────────────────
function renderOverviewTrend() {
  const id = 'chartOverviewTrend'; destroyChart(id);
  const d = DATA.vigitelDM;                          // Vigitel 2025 (oficial, até 2024)
  const cut = cutTS(d.years, d.total, d.fem, d.masc);
  const [tot, fem, mas] = cut.series;
  const sex = F().sex;
  const ds = [];
  // IC 95% aproximado (SE binomial, n efetivo ~25.000 estimado p/ Vigitel após design effect)
  if (sex === 'all') {
    const nEff = 25000;
    const up = tot.map(p => +(p + 1.96*Math.sqrt((p/100)*(1-p/100)/nEff)*100).toFixed(2));
    const lo = tot.map(p => +(p - 1.96*Math.sqrt((p/100)*(1-p/100)/nEff)*100).toFixed(2));
    ds.push({ label: 'IC95% sup', data: up, borderColor:'transparent', pointRadius:0, fill:false });
    ds.push({ label: 'IC95% (aprox.)', data: lo, borderColor:'transparent', pointRadius:0, fill:'-1', backgroundColor:'rgba(0,114,178,.15)' });
  }
  if (sex === 'all' || sex !== 'all')
    ds.push({ label: 'Total (%)', data: tot, borderColor: PALETTE.blue, backgroundColor: 'rgba(0,114,178,.10)', fill: false, tension: .35, borderWidth: 2.5, pointRadius: 3 });
  if (sex === 'all' || sex === 'F')
    ds.push({ label: 'Feminino (%)', data: fem, borderColor: PALETTE.red, borderDash: [4,3], fill: false, tension: .35, borderWidth: 1.8, pointRadius: 2 });
  if (sex === 'all' || sex === 'M')
    ds.push({ label: 'Masculino (%)', data: mas, borderColor: PALETTE.green, borderDash: [4,3], fill: false, tension: .35, borderWidth: 1.8, pointRadius: 2 });
  saveChart(id, new Chart(document.getElementById(id), {
    type: 'line',
    data: { labels: cut.labels, datasets: ds },
    options: { ...baseOpts(), plugins: { ...baseOpts().plugins },
      scales: { ...baseOpts().scales,
        y: { ...baseOpts().scales.y, title: { display:true, text:'Prevalência (%)', color: TICK_COLOR, font:{size:11} }, min:4, max:15 },
        x: { ...baseOpts().scales.x, ticks: { color: TICK_COLOR, font:{size:11}, autoSkip:false, maxRotation:45 } }
      }
    },
  }));
}

// (renderDmType/pizza de tipos de DM removido — proporção precisa sem fonte primária.
//  Os tipos seguem descritos em faixas citadas (SBD/FEBRASGO) nos cards de texto.)

function renderAgeGroup() {
  const id = 'chartAgeGroup'; destroyChart(id);
  const d = DATA.vigitelFaixaEtaria;
  saveChart(id, new Chart(document.getElementById(id), {
    type: 'bar',
    data: {
      labels: d.labels,
      datasets: (function(){ const s=F().sex, ds=[];
        ds.push({ label:'Total', data:d.total, backgroundColor:PALETTE.blue, borderRadius:4 });
        if (s==='all'||s==='F') ds.push({ label:'Feminino', data:d.fem, backgroundColor:PALETTE.red+'99', borderRadius:4 });
        if (s==='all'||s==='M') ds.push({ label:'Masculino', data:d.masc, backgroundColor:PALETTE.green+'99', borderRadius:4 });
        return ds; })(),
    },
    options: { ...baseOpts({ display: false }),
      scales: { ...baseOpts().scales,
        y: { ...baseOpts().scales.y, title:{ display:true, text:'%', color:TICK_COLOR, font:{size:11} } }
      }
    },
  }));
}

function renderGlobalProjection() {
  const id = 'chartGlobalProjection'; destroyChart(id);
  const d = DATA.idfGlobal;
  saveChart(id, new Chart(document.getElementById(id), {
    type: 'bar',
    data: {
      labels: d.anos,
      datasets: [{ label: 'Adultos com DM (mi)', data: d.milhoes, backgroundColor: [PALETTE.blue, PALETTE.amber, PALETTE.red], borderRadius: 6 }],
    },
    options: { ...baseOpts(),
      scales: { ...baseOpts().scales,
        y: { ...baseOpts().scales.y, title:{ display:true, text:'Milhões', color:TICK_COLOR, font:{size:11} }, min: 450 }
      },
      plugins: { ...baseOpts().plugins, tooltip:{ callbacks:{ label: ctx=>`${ctx.raw.toFixed(1)} mi` } } }
    },
  }));
}

function renderTopCountries() {
  const id = 'chartTopCountries'; destroyChart(id);
  const d = DATA.idfTopPaises;
  saveChart(id, new Chart(document.getElementById(id), {
    type: 'bar',
    data: {
      labels: d.paises,
      datasets: [{ label: 'Adultos com DM (mi)', data: d.milhoes, backgroundColor: d.cores, borderRadius: 4 }],
    },
    options: { ...baseOpts(),
      scales: { ...baseOpts().scales,
        y: { ...baseOpts().scales.y, title:{ display:true, text:'Milhões', color:TICK_COLOR, font:{size:11} } },
        x: { ...baseOpts().scales.x, ticks:{ color: TICK_COLOR, font:{size:10} } }
      }
    },
  }));
}

// ─────────────────────────────────────────────────────────────
// PREVALÊNCIA
// ─────────────────────────────────────────────────────────────
function renderStatePrevalence() {
  const id = 'chartStatePrevalence'; destroyChart(id);
  const src = DATA.vigitelCidades;
  const reg = F().region;
  const keep = src.capitais.map((_, i) => i).filter(i => reg === 'all' || src.regioes[i] === reg);
  const d = {
    capitais: keep.map(i => src.capitais[i]),
    prevalencia: keep.map(i => src.prevalencia[i]),
    regioes: keep.map(i => src.regioes[i]),
  };
  const cores = d.regioes.map(r => REGION_COLORS[r] || '#999999');
  saveChart(id, new Chart(document.getElementById(id), {
    type: 'bar',
    data: {
      labels: d.capitais,
      datasets: [{ label: 'Prevalência (%)', data: d.prevalencia, backgroundColor: cores, borderRadius: 3 }],
    },
    options: { ...baseOpts(),
      scales: { ...baseOpts().scales,
        y: { ...baseOpts().scales.y, title:{ display:true, text:'%', color:TICK_COLOR, font:{size:11} }, min:6, max:12 },
        x: { ...baseOpts().scales.x, ticks:{ color: TICK_COLOR, font:{size:10}, maxRotation:65, autoSkip:false } }
      },
      plugins: { ...baseOpts().plugins,
        tooltip:{ callbacks:{ footer: items => {
          const ri = items[0].dataIndex;
          const reg = { N:'Norte', NE:'Nordeste', CO:'Centro-Oeste', SE:'Sudeste', S:'Sul' };
          return 'Região: ' + (reg[d.regioes[ri]]||d.regioes[ri]);
        }}}
      }
    },
  }));
}

function renderEducation() {
  const id = 'chartEducation'; destroyChart(id);
  const d = DATA.vigitelEscolaridade;
  saveChart(id, new Chart(document.getElementById(id), {
    type: 'bar',
    data: {
      labels: d.labels,
      datasets: (function(){ const s=F().sex, ds=[];
        ds.push({ label:'Total', data:d.total, backgroundColor:PALETTE.blue, borderRadius:4 });
        if (s==='all'||s==='F') ds.push({ label:'Feminino', data:d.fem, backgroundColor:PALETTE.red+'aa', borderRadius:4 });
        if (s==='all'||s==='M') ds.push({ label:'Masculino', data:d.masc, backgroundColor:PALETTE.green+'aa', borderRadius:4 });
        return ds; })(),
    },
    options: { ...baseOpts({ display:false }),
      scales:{ ...baseOpts().scales, y:{ ...baseOpts().scales.y, title:{ display:true, text:'%', color:TICK_COLOR, font:{size:11} } } }
    },
  }));
}

function renderSexAge() {
  const id = 'chartSexAge'; destroyChart(id);
  const d = DATA.vigitelFaixaEtaria;
  saveChart(id, new Chart(document.getElementById(id), {
    type: 'line',
    data: {
      labels: d.labels,
      datasets: (function(){ const s=F().sex, ds=[];
        ds.push({ label:'Total', data:d.total, borderColor:PALETTE.blue, fill:false, tension:.35, borderWidth:2.5, pointRadius:4 });
        if (s==='all'||s==='F') ds.push({ label:'Feminino', data:d.fem, borderColor:PALETTE.red, fill:false, tension:.35, borderWidth:1.8, pointRadius:3, borderDash:[4,3] });
        if (s==='all'||s==='M') ds.push({ label:'Masculino', data:d.masc, borderColor:PALETTE.green, fill:false, tension:.35, borderWidth:1.8, pointRadius:3, borderDash:[4,3] });
        return ds; })(),
    },
    options: { ...baseOpts({ display:false }),
      scales:{ ...baseOpts().scales, y:{ ...baseOpts().scales.y, title:{ display:true, text:'%', color:TICK_COLOR, font:{size:11} } } }
    },
  }));
}

function renderSexTrend() {
  const id = 'chartSexTrend'; destroyChart(id);
  const d = DATA.vigitelDM;                          // Vigitel 2025 (oficial, até 2024)
  const cut = cutTS(d.years, d.fem, d.masc);
  const [fem, mas] = cut.series; const s = F().sex;
  saveChart(id, new Chart(document.getElementById(id), {
    type: 'line',
    data: {
      labels: cut.labels,
      datasets: (function(){ const ds=[];
        if (s==='all'||s==='F') ds.push({ label:'Feminino', data:fem, borderColor:PALETTE.red, fill:false, tension:.35, borderWidth:2 });
        if (s==='all'||s==='M') ds.push({ label:'Masculino', data:mas, borderColor:PALETTE.blue, fill:false, tension:.35, borderWidth:2 });
        return ds; })(),
    },
    options: { ...baseOpts({ display:false }),
      scales:{ ...baseOpts().scales,
        y:{ ...baseOpts().scales.y, title:{ display:true, text:'%', color:TICK_COLOR, font:{size:11} }, min:4, max:16 },
        x:{ ...baseOpts().scales.x, ticks:{ color:TICK_COLOR, font:{size:10}, maxRotation:45 } }
      }
    },
  }));
}

// ─────────────────────────────────────────────────────────────
// MORTALIDADE
// ─────────────────────────────────────────────────────────────
function renderMortalityTrend() {
  const id = 'chartMortalityTrend'; destroyChart(id);
  const d = DATA.mortalidade;
  const cut = cutTS(d.anos, d.obitos); const [ob] = cut.series;
  saveChart(id, new Chart(document.getElementById(id), {
    type: 'line',
    data: {
      labels: cut.labels,
      datasets: [
        { label: 'Óbitos', data: ob, borderColor: PALETTE.red, backgroundColor:'rgba(231,76,60,.08)', fill:true, tension:.35, borderWidth:2.5, pointRadius:3 },
      ],
    },
    options: { ...baseOpts(),
      scales:{ ...baseOpts().scales,
        y:{ ...baseOpts().scales.y, title:{ display:true, text:'Nº de óbitos', color:TICK_COLOR, font:{size:11} } },
        x:{ ...baseOpts().scales.x, ticks:{ color:TICK_COLOR, font:{size:11}, autoSkip:false, maxRotation:45 } }
      },
      plugins:{ ...baseOpts().plugins, tooltip:{ callbacks:{ label: ctx=>'Óbitos: '+ctx.raw.toLocaleString('pt-BR') } } }
    },
  }));
}

function renderMortalityAge() {
  const id = 'chartMortalityAge'; destroyChart(id);
  const d = DATA.mortalidadeFaixaEtaria;
  saveChart(id, new Chart(document.getElementById(id), {
    type: 'bar',
    data: {
      labels: d.labels,
      datasets: [{ label: 'Óbitos', data: d.obitos, backgroundColor: d.labels.map((l,i)=> i>=4?PALETTE.red:PALETTE.blue+'99'), borderRadius:4 }],
    },
    options: { ...baseOpts(),
      scales:{ ...baseOpts().scales, y:{ ...baseOpts().scales.y, title:{ display:true, text:'Nº óbitos', color:TICK_COLOR, font:{size:11} } } }
    },
  }));
}

function renderMortalityRegion() {
  const id = 'chartMortalityRegion'; destroyChart(id);
  const D = DATA.mortalidadeRegiao;
  const code = ['N','NE','CO','SE','S']; // alinhado a D.labels
  const corMap = { N:REGION_COLORS.N, NE:REGION_COLORS.NE, CO:REGION_COLORS.CO, SE:REGION_COLORS.SE, S:REGION_COLORS.S };
  const sel = F().region;
  const keep = code.map((c,i)=>i).filter(i => sel==='all' || code[i]===sel);
  const d = { labels: keep.map(i=>D.labels[i]), taxa: keep.map(i=>D.taxa[i]) };
  const cores = keep.map(i => corMap[code[i]]);
  saveChart(id, new Chart(document.getElementById(id), {
    type: 'bar',
    data: {
      labels: d.labels,
      datasets: [{ label: 'Taxa/100k hab', data: d.taxa, backgroundColor: cores, borderRadius:5 }],
    },
    options: { ...baseOpts(),
      scales:{ ...baseOpts().scales, y:{ ...baseOpts().scales.y, min:24, title:{ display:true, text:'Por 100k hab. (bruta)', color:TICK_COLOR, font:{size:11} } } }
    },
  }));
}

function renderMortalityCid() {
  const id = 'chartMortalityCid'; destroyChart(id);
  const d = DATA.mortalidadeCID;
  makeLegend('legendMortalityCid', d.labels.map((l,i)=>({ label:`${l} ${d.valores[i]}%`, color:d.cores[i] })));
  saveChart(id, new Chart(document.getElementById(id), {
    type: 'pie',
    data: { labels: d.labels, datasets: [{ data: d.valores, backgroundColor: d.cores, borderWidth:2, borderColor:'#fff' }] },
    options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label: ctx=>`${ctx.label}: ${ctx.raw}%` } } } },
  }));
}

function renderMortalityComparison() {
  const id = 'chartMortalityComparison'; destroyChart(id);
  const d = DATA.mortalidadeComparacao;
  saveChart(id, new Chart(document.getElementById(id), {
    type: 'bar',
    data: {
      labels: d.causas,
      datasets: [{ label: 'Óbitos (2024)', data: d.obitos, backgroundColor: d.cores, borderRadius:4 }],
    },
    options: { ...baseOpts(),
      plugins: { ...baseOpts().plugins, tooltip:{ callbacks:{ label: ctx=>'Óbitos: '+ctx.raw.toLocaleString('pt-BR') } } },
      scales:{ ...baseOpts().scales,
        y:{ ...baseOpts().scales.y, title:{ display:true, text:'Nº de óbitos', color:TICK_COLOR, font:{size:11} } },
        x:{ ...baseOpts().scales.x, ticks:{ font:{size:10}, color:TICK_COLOR } }
      }
    },
  }));
}

// ─────────────────────────────────────────────────────────────
// INTERNAÇÕES
// ─────────────────────────────────────────────────────────────
function renderHospTrend() {
  const id = 'chartHospTrend'; destroyChart(id);
  const d = DATA.internacoes;
  const cut = cutTS(d.anos, d.total, d.custototal); const [tot, cst] = cut.series;
  saveChart(id, new Chart(document.getElementById(id), {
    type: 'line',
    data: {
      labels: cut.labels,
      datasets: [
        { label: 'Internações', data: tot, borderColor: PALETTE.blue, backgroundColor:'rgba(26,86,219,.08)', fill:true, tension:.35, borderWidth:2.5, pointRadius:3, yAxisID:'y' },
        { label: 'Custo total (R$ mi)', data: cst, borderColor: PALETTE.amber, borderDash:[5,3], fill:false, tension:.35, borderWidth:2, pointRadius:3, yAxisID:'y1' },
      ],
    },
    options: { ...baseOpts({ display:false }),
      scales:{
        x:{ ...baseOpts().scales.x, ticks:{ color:TICK_COLOR, font:{size:11}, autoSkip:false, maxRotation:45 } },
        y:{ ...baseOpts().scales.y, title:{ display:true, text:'Internações', color:TICK_COLOR, font:{size:11} } },
        y1:{ position:'right', grid:{drawOnChartArea:false}, ticks:{ color:PALETTE.amber, font:{size:11} }, title:{ display:true, text:'R$ milhões', color:PALETTE.amber, font:{size:11} } },
      }
    },
  }));
}

function renderHospComplication() {
  const id = 'chartHospComplication'; destroyChart(id);
  const d = DATA.internacoesRegiao;
  saveChart(id, new Chart(document.getElementById(id), {
    type: 'bar',
    indexAxis: 'y',
    data: {
      labels: d.labels,
      datasets: [{ label: 'Internações (2024)', data: d.n, backgroundColor: PALETTE.blue+'cc', borderRadius:3 }],
    },
    options: { ...baseOpts(),
      scales:{
        y:{ grid:{ color:GRID_COLOR }, ticks:{ color:TICK_COLOR, font:{size:11} } },
        x:{ grid:{ color:GRID_COLOR }, ticks:{ color:TICK_COLOR, font:{size:11} }, title:{ display:true, text:'Nº de internações', color:TICK_COLOR, font:{size:11} } }
      },
      plugins:{ ...baseOpts().plugins, tooltip:{ callbacks:{ label: ctx=>ctx.raw.toLocaleString('pt-BR') } } }
    },
  }));
}

function renderHospSexAge() {
  const id = 'chartHospSexAge'; destroyChart(id);
  const d = DATA.internacoesSexoFaixa;
  saveChart(id, new Chart(document.getElementById(id), {
    type: 'bar',
    data: {
      labels: d.labels,
      datasets: (function(){ const s=F().sex, ds=[];
        if (s==='all'||s==='F') ds.push({ label:'Feminino', data:d.fem, backgroundColor:PALETTE.red+'cc', borderRadius:3 });
        if (s==='all'||s==='M') ds.push({ label:'Masculino', data:d.masc, backgroundColor:PALETTE.blue+'cc', borderRadius:3 });
        return ds; })(),
    },
    options: { ...baseOpts({ display:false }),
      scales:{ ...baseOpts().scales, y:{ ...baseOpts().scales.y, title:{ display:true, text:'Internações', color:TICK_COLOR, font:{size:11} } } }
    },
  }));
}

function renderAmputations() {
  const id = 'chartAmputations'; destroyChart(id);
  const d = DATA.amputacoesAnos;
  const cut = cutTS(d.anos, d.total); const [tot] = cut.series;
  saveChart(id, new Chart(document.getElementById(id), {
    type: 'line',
    data: {
      labels: cut.labels,
      datasets: [
        { label: 'Amputações de membros inferiores (SUS)', data: tot, borderColor: PALETTE.red, backgroundColor:'rgba(213,94,0,.08)', fill:true, tension:.35, borderWidth:2.5, pointRadius:3 },
      ],
    },
    options: { ...baseOpts({ display:false }),
      scales:{ ...baseOpts().scales,
        y:{ ...baseOpts().scales.y, title:{ display:true, text:'Procedimentos', color:TICK_COLOR, font:{size:11} } },
        x:{ ...baseOpts().scales.x, ticks:{ color:TICK_COLOR, font:{size:11}, autoSkip:false, maxRotation:45 } }
      }
    },
  }));
}

// ─────────────────────────────────────────────────────────────
// FATORES DE RISCO
// ─────────────────────────────────────────────────────────────
function renderObesityDiabetes() {
  const id = 'chartObesityDiabetes'; destroyChart(id);
  const d = DATA.vigitel2024;                        // dado oficial real 2006–2024
  const cut = cutTS(d.years, d.excessoPeso, d.diabetes, d.hipertensao);
  const [exc, dia, hip] = cut.series;
  saveChart(id, new Chart(document.getElementById(id), {
    type: 'line',
    data: {
      labels: cut.labels,
      datasets: [
        { label: 'Excesso de peso (%)', data: exc, borderColor: PALETTE.red, fill:false, tension:.35, borderWidth:2.5, pointRadius:3 },
        { label: 'Diabetes (%)', data: dia, borderColor: PALETTE.blue, fill:false, tension:.35, borderWidth:2.5, pointRadius:3 },
        { label: 'Hipertensão (%)', data: hip, borderColor: PALETTE.amber, borderDash:[5,3], fill:false, tension:.35, borderWidth:2, pointRadius:2 },
      ],
    },
    options: { ...baseOpts({ display:false }),
      scales:{ ...baseOpts().scales,
        y:{ ...baseOpts().scales.y, title:{ display:true, text:'%', color:TICK_COLOR, font:{size:11} } },
        x:{ ...baseOpts().scales.x, ticks:{ color:TICK_COLOR, font:{size:10}, maxRotation:45, autoSkip:false } }
      }
    },
  }));
}

function renderSedentary() {
  const id = 'chartSedentary'; if (!document.getElementById(id)) return; destroyChart(id);
  const d = DATA.inatividadeFaixa;
  saveChart(id, new Chart(document.getElementById(id), {
    type: 'bar',
    data: {
      labels: d.labels,
      datasets: [{ label: 'Fisicamente inativos (%)', data: d.perc, backgroundColor: PALETTE.amber+'cc', borderRadius:4 }],
    },
    options: { ...baseOpts(),
      scales:{ ...baseOpts().scales,
        y:{ ...baseOpts().scales.y, title:{ display:true, text:'%', color:TICK_COLOR, font:{size:11} }, min:0 }
      }
    },
  }));
}

function renderDiet() {
  const id = 'chartDiet'; if (!document.getElementById(id)) return; destroyChart(id);
  const d = DATA.inatividadeEscolaridade;
  saveChart(id, new Chart(document.getElementById(id), {
    type: 'bar',
    indexAxis: 'y',
    data: {
      labels: d.labels,
      datasets: [{ label: 'Fisicamente inativos (%)', data: d.perc, backgroundColor: PALETTE.red+'bb', borderRadius:3 }],
    },
    options: { ...baseOpts(),
      scales:{
        y:{ grid:{ color:GRID_COLOR }, ticks:{ color:TICK_COLOR, font:{size:10} } },
        x:{ grid:{ color:GRID_COLOR }, ticks:{ color:TICK_COLOR, font:{size:11} }, title:{ display:true, text:'%', color:TICK_COLOR, font:{size:11} } }
      }
    },
  }));
}

// Removido: renderRiskRelative usava risco relativo de literatura (não é dado primário).
function renderRiskRelative() { /* removido — sem fonte primária real */ }

// ─────────────────────────────────────────────────────────────
// GEOGRÁFICO
// ─────────────────────────────────────────────────────────────
function renderStateComparison() {
  const id = 'chartStateComparison'; destroyChart(id);
  const D = DATA.estadosPrevalencia, idx = stIdx();
  const d = { estados: idx.map(i=>D.estados[i]), prev: idx.map(i=>D.prev[i]), mort: idx.map(i=>D.mort[i]) };
  saveChart(id, new Chart(document.getElementById(id), {
    type: 'bar',
    data: {
      labels: d.estados,
      datasets: [
        { label: 'Prevalência DM (%)', data: d.prev, backgroundColor: PALETTE.blue+'cc', borderRadius:3, yAxisID:'y' },
        { label: 'Mort./100k hab', data: d.mort, type:'line', borderColor: PALETTE.red, fill:false, tension:.3, borderWidth:2, pointRadius:3, yAxisID:'y1' },
      ],
    },
    options: { ...baseOpts({ display:false }),
      scales:{
        x:{ grid:{color:GRID_COLOR}, ticks:{ color:TICK_COLOR, font:{size:10}, maxRotation:65, autoSkip:false } },
        y:{ grid:{color:GRID_COLOR}, title:{ display:true, text:'Prevalência (%)', color:TICK_COLOR, font:{size:11} }, min:6, max:12, ticks:{ color:TICK_COLOR, font:{size:11} } },
        y1:{ position:'right', grid:{drawOnChartArea:false}, ticks:{ color:PALETTE.red, font:{size:11}, stepSize:10 }, title:{ display:true, text:'Taxa mort./100k', color:PALETTE.red, font:{size:11} }, min:10, max:55 },
      }
    },
  }));
}

// ─────────────────────────────────────────────────────────────
// VIGITEL tab
// ─────────────────────────────────────────────────────────────
function renderVigitelAll() {
  const id = 'chartVigitelAll'; destroyChart(id);
  const d = DATA.vigitel2024;                        // dado oficial real 2006–2024
  const cut = cutTS(d.years, d.diabetes, d.excessoPeso, d.hipertensao);
  const [dia, exc, hip] = cut.series;
  saveChart(id, new Chart(document.getElementById(id), {
    type: 'line',
    data: {
      labels: cut.labels,
      datasets: [
        { label: 'Diabetes (%)', data: dia, borderColor: PALETTE.blue, fill:false, tension:.35, borderWidth:2.5, pointRadius:3 },
        { label: 'Excesso de peso (%)', data: exc, borderColor: PALETTE.red, fill:false, tension:.35, borderWidth:2, pointRadius:3 },
        { label: 'Hipertensão (%)', data: hip, borderColor: PALETTE.purple, borderDash:[3,3], fill:false, tension:.35, borderWidth:2, pointRadius:2 },
      ],
    },
    options: { ...baseOpts({ display:false }),
      scales:{ ...baseOpts().scales,
        y:{ ...baseOpts().scales.y, title:{ display:true, text:'%', color:TICK_COLOR, font:{size:11} } },
        x:{ ...baseOpts().scales.x, ticks:{ color:TICK_COLOR, font:{size:10}, maxRotation:45, autoSkip:false } }
      }
    },
  }));
}

function renderVigitelCidades() {
  const id = 'chartVigitelCidades'; destroyChart(id);
  const src = DATA.vigitelCidades;
  const reg = F().region;
  const keep = src.capitais.map((_, i) => i).filter(i => reg === 'all' || src.regioes[i] === reg);
  const d = { capitais: keep.map(i=>src.capitais[i]), prevalencia: keep.map(i=>src.prevalencia[i]), regioes: keep.map(i=>src.regioes[i]) };
  const cores = d.regioes.map(r => REGION_COLORS[r] || '#999999');
  saveChart(id, new Chart(document.getElementById(id), {
    type: 'bar',
    indexAxis: 'y',
    data: {
      labels: d.capitais,
      datasets: [{ label: 'Prevalência DM (%)', data: d.prevalencia, backgroundColor: cores, borderRadius:3 }],
    },
    options: { ...baseOpts(),
      scales:{
        y:{ grid:{color:GRID_COLOR}, ticks:{ color:TICK_COLOR, font:{size:10} } },
        x:{ grid:{color:GRID_COLOR}, ticks:{ color:TICK_COLOR, font:{size:11} }, title:{ display:true, text:'%', color:TICK_COLOR, font:{size:11} }, min:6, max:12 }
      }
    },
  }));
}

// (renderVigitelSexEdu e renderVigitelAtividade removidos — dados não primários.)

// ─────────────────────────────────────────────────────────────
// PNS / FONTES
// ─────────────────────────────────────────────────────────────
function renderFontesComp() {
  const id = 'chartFontesComp'; destroyChart(id);
  saveChart(id, new Chart(document.getElementById(id), {
    type: 'bar',
    data: {
      labels: ['Vigitel\n(capitais)','PNS\n(nacional)'],
      datasets: [{ label: 'Prevalência DM 2019 (%)', data: [DATA.comparacaoFontes.vigitel.prev2019, DATA.comparacaoFontes.pns.prev2019], backgroundColor: [PALETTE.blue, PALETTE.teal], borderRadius:6 }],
    },
    options: { ...baseOpts(),
      scales:{ ...baseOpts().scales, y:{ ...baseOpts().scales.y, title:{ display:true, text:'%', color:TICK_COLOR, font:{size:11} }, min:6 } },
      plugins:{ ...baseOpts().plugins, tooltip:{ callbacks:{ label: ctx=>ctx.raw+'% (2019)' } } }
    },
  }));
}

function renderPnsEvol() {
  const id = 'chartPnsEvol'; destroyChart(id);
  const d = DATA.pns;
  saveChart(id, new Chart(document.getElementById(id), {
    type: 'line',
    data: {
      labels: d.anos,
      datasets: [
        { label: 'Total', data: d.total, borderColor: PALETTE.blue, fill:false, tension:0, borderWidth:2.5, pointRadius:5 },
        { label: 'Feminino', data: d.fem, borderColor: PALETTE.red, fill:false, tension:0, borderWidth:2, pointRadius:4, borderDash:[4,3] },
        { label: 'Masculino', data: d.masc, borderColor: PALETTE.green, fill:false, tension:0, borderWidth:2, pointRadius:4, borderDash:[4,3] },
      ],
    },
    options: { ...baseOpts({ display:false }),
      scales:{ ...baseOpts().scales, y:{ ...baseOpts().scales.y, title:{ display:true, text:'%', color:TICK_COLOR, font:{size:11} }, min:5 } }
    },
  }));
}

function renderPnsRegiao() {
  const id = 'chartPnsRegiao'; destroyChart(id);
  const D = DATA.pnsRegiao;
  const code = ['N','NE','CO','SE','S'], sel = F().region;
  const keep = code.map((_,i)=>i).filter(i => sel==='all' || code[i]===sel);
  const d = { labels: keep.map(i=>D.labels[i]), prev: keep.map(i=>D.prev[i]) };
  const cores = keep.map(i => REGION_COLORS[code[i]]);
  saveChart(id, new Chart(document.getElementById(id), {
    type: 'bar',
    data: { labels: d.labels, datasets: [{ label: 'Prevalência (%)', data: d.prev, backgroundColor: cores, borderRadius:5 }] },
    options: { ...baseOpts(),
      scales:{ ...baseOpts().scales, y:{ ...baseOpts().scales.y, title:{ display:true, text:'%', color:TICK_COLOR, font:{size:11} }, min:5 } }
    },
  }));
}

function renderIdfEdicoes() {
  const id = 'chartIdfEdicoes'; destroyChart(id);
  const d = DATA.idfEdicoes;
  saveChart(id, new Chart(document.getElementById(id), {
    type: 'bar',
    data: {
      labels: d.edicoes,
      datasets: [{ label: 'Adultos com DM (mi)', data: d.globalMilhoes, backgroundColor: [PALETTE.blue+'99', PALETTE.blue, '#1e3a8a', PALETTE.red], borderRadius:5 }],
    },
    options: { ...baseOpts(),
      scales:{ ...baseOpts().scales, y:{ ...baseOpts().scales.y, title:{ display:true, text:'Milhões', color:TICK_COLOR, font:{size:11} } } },
      plugins:{ ...baseOpts().plugins, tooltip:{ callbacks:{ label: ctx=>ctx.raw+' milhões' } } }
    },
  }));
}

function renderCustoBrasil() {
  const id = 'chartCustoBrasil'; destroyChart(id);
  const d = DATA.custoBrasil;
  saveChart(id, new Chart(document.getElementById(id), {
    type: 'bar',
    data: {
      labels: d.labels,
      datasets: [{ label: 'R$ bilhões', data: d.valores, backgroundColor: [PALETTE.gray, PALETTE.blue, PALETTE.purple, PALETTE.red], borderRadius:5 }],
    },
    options: { ...baseOpts(),
      scales:{ ...baseOpts().scales, y:{ ...baseOpts().scales.y, title:{ display:true, text:'R$ bilhões', color:TICK_COLOR, font:{size:11} } } },
      plugins:{ ...baseOpts().plugins, tooltip:{ callbacks:{
        label: ctx=>'R$ '+ctx.raw.toFixed(1)+' bi',
        afterLabel: ctx=>DATA.custoBrasil.nota[ctx.dataIndex]
      } } }
    },
  }));
}

// (renderDcnt removido — óbitos prematuros por DCNT eram estimativa, não dado primário.)

// ─────────────────────────────────────────────────────────────
// ANÁLISE ESTATÍSTICA
// ─────────────────────────────────────────────────────────────
function setText(id, txt) { const el = document.getElementById(id); if (el) el.textContent = txt; }

function renderForecast() {
  const id = 'chartForecast'; destroyChart(id);
  const d = DATA.vigitel2024;                       // dado oficial real 2006–2024
  const years = d.years;
  const reg = Stats.linreg(years, d.diabetes);
  const futureYears = [2025,2026,2027,2028,2029,2030,2031,2032,2033,2034,2035];
  const allYears = [...years, ...futureYears];

  // observado (com nulls no futuro); reta OLS cobrindo TODO o período (sólida no
  // histórico, tracejada na projeção) — passa pelos pontos reais, sem "degrau".
  const H = years.length;
  const obs = [...d.diabetes, ...futureYears.map(()=>null)];
  const trend = allYears.map(y => +reg.predict(y).toFixed(2));

  setText('forecastEq', `ŷ = ${reg.slope.toFixed(3)}·ano ${reg.intercept<0?'−':'+'} ${Math.abs(reg.intercept).toFixed(1)} · R² = ${reg.r2.toFixed(3)}`);
  setText('kpiR2Forecast', reg.r2.toFixed(3));
  // CAGR
  const cagr = ((d.diabetes[d.diabetes.length-1]/d.diabetes[0])**(1/(years.length-1)) - 1)*100;
  setText('kpiCagr', '+'+cagr.toFixed(1)+'% a.a.');

  saveChart(id, new Chart(document.getElementById(id), {
    type: 'line',
    data: {
      labels: allYears,
      datasets: [
        { label:'Observado', data: obs, borderColor: PALETTE.blue, backgroundColor:'rgba(26,86,219,.08)', fill:true, tension:.3, borderWidth:2.5, pointRadius:3 },
        { label:'Tendência + Projeção (OLS)', data: trend, borderColor: PALETTE.red, fill:false, tension:0, borderWidth:2,
          pointRadius: ctx => ctx.dataIndex >= H ? 3 : 0, pointStyle:'rectRot',
          segment:{ borderDash: ctx => ctx.p0DataIndex >= H-1 ? [6,4] : undefined } },
      ],
    },
    options: { ...baseOpts({ display:false }),
      scales:{
        x:{ grid:{color:GRID_COLOR}, ticks:{ color:TICK_COLOR, font:{size:10}, maxRotation:45, autoSkip:false } },
        y:{ grid:{color:GRID_COLOR}, ticks:{ color:TICK_COLOR, font:{size:11} }, title:{ display:true, text:'Prevalência (%)', color:TICK_COLOR, font:{size:11} }, min:4 },
      },
      plugins:{ ...baseOpts().plugins, tooltip:{ callbacks:{ label: ctx=> ctx.raw==null?null:`${ctx.dataset.label}: ${ctx.raw}%` } } }
    },
  }));
}

function renderScatterObDi() {
  const id = 'chartScatterObDi'; destroyChart(id);
  const V = DATA.vigitel2024; const yi = yrIdx(V.years);   // dado oficial real
  const d = { obesidade: yi.map(i=>V.excessoPeso[i]), diabetes: yi.map(i=>V.diabetes[i]) };
  const pts = d.obesidade.map((o,i)=>({ x:o, y:d.diabetes[i] }));
  const reg = Stats.linreg(d.obesidade, d.diabetes);
  const r = Stats.pearson(d.obesidade, d.diabetes);
  const xmin = Stats.min(d.obesidade), xmax = Stats.max(d.obesidade);
  const line = [{x:xmin, y:+reg.predict(xmin).toFixed(2)}, {x:xmax, y:+reg.predict(xmax).toFixed(2)}];
  const n1 = d.obesidade.length;
  setText('scatter1Stats', corrLabel(r, n1));
  setText('kpiCorrObDi', isFinite(r) ? r.toFixed(2) : '—');

  saveChart(id, new Chart(document.getElementById(id), {
    type:'scatter',
    data:{ datasets:[
      { label:'Anos', data: pts, backgroundColor: PALETTE.blue, pointRadius:5 },
      { label:'Regressão', data: line, type:'line', borderColor: PALETTE.red, borderWidth:2, borderDash:[5,3], pointRadius:0, fill:false },
    ]},
    options:{ ...baseOpts({ display:false }),
      scales:{
        x:{ grid:{color:GRID_COLOR}, ticks:{color:TICK_COLOR, font:{size:11}}, title:{display:true, text:'Excesso de peso (%)', color:TICK_COLOR, font:{size:11}} },
        y:{ grid:{color:GRID_COLOR}, ticks:{color:TICK_COLOR, font:{size:11}}, title:{display:true, text:'Diabetes (%)', color:TICK_COLOR, font:{size:11}} },
      },
      plugins:{ ...baseOpts().plugins, tooltip:{ callbacks:{ label: ctx=> ctx.datasetIndex===0?`Obes ${ctx.raw.x}% → DM ${ctx.raw.y}%`:null } } }
    },
  }));
}

function renderScatterPrevMort() {
  const id = 'chartScatterPrevMort'; destroyChart(id);
  const D = DATA.estadosPrevalencia, idx = stIdx();
  const prev = idx.map(i=>D.prev[i]), mort = idx.map(i=>D.mort[i]), ufs = idx.map(i=>D.estados[i]);
  const d = { prev, mort, estados: ufs };
  const pts = d.prev.map((p,i)=>({ x:p, y:d.mort[i], uf:d.estados[i] }));
  const reg = Stats.linreg(d.prev, d.mort);
  const r = Stats.pearson(d.prev, d.mort);
  const xmin = Stats.min(d.prev), xmax = Stats.max(d.prev);
  const line = [{x:xmin, y:+reg.predict(xmin).toFixed(1)}, {x:xmax, y:+reg.predict(xmax).toFixed(1)}];
  const n2 = d.prev.length;
  setText('scatter2Stats', corrLabel(r, n2));
  setText('kpiCorrPrevMort', isFinite(r) ? r.toFixed(2) : '—');

  saveChart(id, new Chart(document.getElementById(id), {
    type:'scatter',
    data:{ datasets:[
      { label:'UFs', data: pts, backgroundColor: PALETTE.teal, pointRadius:5 },
      { label:'Regressão', data: line, type:'line', borderColor: PALETTE.red, borderWidth:2, borderDash:[5,3], pointRadius:0, fill:false },
    ]},
    options:{ ...baseOpts({ display:false }),
      scales:{
        x:{ grid:{color:GRID_COLOR}, ticks:{color:TICK_COLOR, font:{size:11}}, title:{display:true, text:'Prevalência (%)', color:TICK_COLOR, font:{size:11}} },
        y:{ grid:{color:GRID_COLOR}, ticks:{color:TICK_COLOR, font:{size:11}}, title:{display:true, text:'Mortalidade /100k', color:TICK_COLOR, font:{size:11}} },
      },
      plugins:{ ...baseOpts().plugins, tooltip:{ callbacks:{ label: ctx=> ctx.datasetIndex===0?`${ctx.raw.uf}: ${ctx.raw.x}% · ${ctx.raw.y}/100k`:null } } }
    },
  }));
}

function renderCorrHeatmap() {
  const el = document.getElementById('corrHeatmap'); if (!el) return;
  const v = DATA.vigitel2024;                        // dado oficial real 2006–2024
  const vars = [
    { key:'diabetes',    label:'DM' },
    { key:'excessoPeso', label:'Exc.peso' },
    { key:'hipertensao', label:'Hipert.' },
  ];
  const n = vars.length;
  el.style.gridTemplateColumns = `70px repeat(${n}, 1fr)`;
  let html = '<div class="corr-label"></div>';
  vars.forEach(c => html += `<div class="corr-label">${c.label}</div>`);
  vars.forEach(rv => {
    html += `<div class="corr-label row">${rv.label}</div>`;
    vars.forEach(cv => {
      const r = Stats.pearson(v[rv.key], v[cv.key]);
      const alpha = Math.min(Math.abs(r), 1);
      const bg = r >= 0
        ? `rgba(26,86,219,${(0.12 + alpha*0.8).toFixed(2)})`
        : `rgba(231,76,60,${(0.12 + alpha*0.8).toFixed(2)})`;
      const txt = alpha > 0.55 ? '#fff' : '#1e293b';
      html += `<div class="corr-cell" style="background:${bg};color:${txt}">${r.toFixed(2)}</div>`;
    });
  });
  el.innerHTML = html;
}

function renderDistRegion() {
  const id = 'chartDistRegion'; destroyChart(id);
  const d = DATA.estadosPrevalencia;
  const sel = F().region;
  const regions = ['N','NE','CO','SE','S'].filter(rg => sel==='all' || rg===sel);
  const names = { N:'Norte', NE:'Nordeste', CO:'Centro-Oeste', SE:'Sudeste', S:'Sul' };
  const ranges = [], means = [];
  regions.forEach(rg => {
    const vals = d.prev.filter((_,i)=> d.regiao[i]===rg);
    ranges.push([Stats.min(vals), Stats.max(vals)]);
    means.push(+Stats.mean(vals).toFixed(2));
  });
  saveChart(id, new Chart(document.getElementById(id), {
    type:'bar',
    data:{ labels: regions.map(r=>names[r]), datasets:[
      { label:'Amplitude (mín–máx)', data: ranges, backgroundColor:'rgba(26,86,219,.25)', borderColor: PALETTE.blue, borderWidth:1, borderRadius:4, barPercentage:0.5 },
      { label:'Média', data: means, type:'line', showLine:false, backgroundColor: PALETTE.red, borderColor: PALETTE.red, pointRadius:7, pointStyle:'rectRot' },
    ]},
    options:{ ...baseOpts({ display:false }),
      scales:{
        x:{ grid:{color:GRID_COLOR}, ticks:{color:TICK_COLOR, font:{size:10}} },
        y:{ grid:{color:GRID_COLOR}, ticks:{color:TICK_COLOR, font:{size:11}}, title:{display:true, text:'Prevalência (%)', color:TICK_COLOR, font:{size:11}}, min:6 },
      },
      plugins:{ ...baseOpts().plugins, tooltip:{ callbacks:{
        label: ctx => ctx.datasetIndex===0
          ? `Mín–Máx: ${ctx.raw[0]}% – ${ctx.raw[1]}%`
          : `Média: ${ctx.raw}%`
      } } }
    },
  }));
}

function renderBubble() {
  const id = 'chartBubble'; destroyChart(id);
  const d = DATA.estadosPrevalencia;
  const sel = F().region;
  const regCor = REGION_COLORS;
  const regNome = { N:'Norte', NE:'Nordeste', CO:'Centro-Oeste', SE:'Sudeste', S:'Sul' };
  const datasets = Object.keys(regCor).filter(rg => sel === 'all' || sel === rg).map(rg => ({
    label: regNome[rg],
    data: d.estados.map((uf,i)=> d.regiao[i]===rg ? { x:d.prev[i], y:d.mort[i], r: Math.sqrt(d.pop[i])*3.2, uf } : null).filter(Boolean),
    backgroundColor: regCor[rg]+'cc',
    borderColor: regCor[rg],
    borderWidth:1,
  }));
  makeLegend('bubbleLegend', Object.keys(regCor).map(rg=>({ label: regNome[rg], color: regCor[rg] })));
  saveChart(id, new Chart(document.getElementById(id), {
    type:'bubble',
    data:{ datasets },
    options:{ ...baseOpts({ display:false }),
      layout:{ padding:10 },
      scales:{
        x:{ grid:{color:GRID_COLOR}, ticks:{color:TICK_COLOR, font:{size:11}}, title:{display:true, text:'Prevalência (%)', color:TICK_COLOR, font:{size:11}}, min:6.5, max:11.8 },
        y:{ grid:{color:GRID_COLOR}, ticks:{color:TICK_COLOR, font:{size:11}}, title:{display:true, text:'Mortalidade /100k hab', color:TICK_COLOR, font:{size:11}}, min:25, max:46 },
      },
      plugins:{ ...baseOpts().plugins, tooltip:{ callbacks:{
        label: ctx => `${ctx.raw.uf}: prev ${ctx.raw.x}% · mort ${ctx.raw.y}/100k`
      } } }
    },
  }));
}

function renderBurden() {
  const id = 'chartBurden'; destroyChart(id);
  const D = DATA.estadosPrevalencia, idx = stIdx();
  const prevArr = idx.map(i=>D.prev[i]);
  const burden = idx.map(i=>({ uf:D.estados[i], casos: (D.prev[i]/100)*D.pop[i]*1e6, regiao:D.regiao[i] }));
  burden.sort((a,b)=> b.casos - a.casos);
  const total = burden.reduce((s,b)=> s+b.casos, 0);
  setText('kpiTotalCases', (total/1e6).toFixed(1)+' mi');
  setText('kpiMeanPrev', Stats.mean(prevArr).toFixed(1)+'% ± '+Stats.std(prevArr).toFixed(1));
  const regCor = REGION_COLORS;
  saveChart(id, new Chart(document.getElementById(id), {
    type:'bar',
    data:{ labels: burden.map(b=>b.uf), datasets:[
      { label:'Casos estimados', data: burden.map(b=> +(b.casos/1000).toFixed(0)), backgroundColor: burden.map(b=>regCor[b.regiao]+'cc'), borderRadius:3 },
    ]},
    options:{ ...baseOpts(),
      scales:{
        x:{ grid:{color:GRID_COLOR}, ticks:{color:TICK_COLOR, font:{size:10}, maxRotation:60, autoSkip:false} },
        y:{ grid:{color:GRID_COLOR}, ticks:{color:TICK_COLOR, font:{size:11}}, title:{display:true, text:'Casos estimados (mil)', color:TICK_COLOR, font:{size:11}} },
      },
      plugins:{ ...baseOpts().plugins, tooltip:{ callbacks:{ label: ctx=> ctx.raw.toLocaleString('pt-BR')+' mil casos (estim.)' } } }
    },
  }));
}

// ─────────────────────────────────────────────────────────────
// KPI SPARKLINES / METERS — injeção automática por aba
// ─────────────────────────────────────────────────────────────
function hexA(hex, a) {
  const h = hex.replace('#','');
  const r = parseInt(h.substring(0,2),16), g = parseInt(h.substring(2,4),16), b = parseInt(h.substring(4,6),16);
  return `rgba(${r},${g},${b},${a})`;
}

// Configuração por aba: um item por KPI-card, na ordem em que aparecem.
// kind 'line'|'bar' => sparkline (usa série); kind 'meter' => barra valor/max; null => ignora.
function kpiSparkConfig() {
  const V = DATA.vigitel2024, M = DATA.mortalidade, I = DATA.internacoes, P = DATA.pns;
  const C = PALETTE;
  return {
    overview: [
      { kind:'line', data:V.diabetes, color:C.blue },
      { kind:'line', data:V.diabetes, color:C.blue },
      { kind:'line', data:M.obitos, color:C.red },
      { kind:'line', data:I.total, color:C.blue },
      { kind:'line', data:I.custototal, color:C.amber },
      { kind:'bar',  data:[140.9,74.2,33,32.2,16.8], colors:['#cbd5e1','#cbd5e1','#cbd5e1','#cbd5e1',C.red] },
    ],
    prevalence: [
      { kind:'meter', value:8.1, max:12, color:C.teal },
      { kind:'meter', value:9.8, max:12, color:C.amber },
      { kind:'meter', value:9.4, max:12, color:C.purple },
      { kind:'meter', value:10.8, max:12, color:C.blue },
      { kind:'meter', value:10.3, max:12, color:C.green },
      { kind:'meter', value:9.6, max:12, color:'#64748b' },
    ],
    mortality: [
      { kind:'line', data:M.obitos, color:C.red },
      { kind:'line', data:M.obitos, color:C.red },
      { kind:'meter', value:51.3, max:100, color:C.red },
      { kind:'meter', value:68.7, max:100, color:'#64748b' },
      { kind:'line', data:M.obitos, color:C.red },
      { kind:'meter', value:180, max:200, color:C.amber },
    ],
    hospitalization: [
      { kind:'line', data:I.total, color:C.blue },
      { kind:'meter', value:419, max:500, color:C.blue },
      { kind:'line', data:I.custototal, color:C.amber },
      { kind:'meter', value:1145, max:2000, color:C.amber },
      { kind:'line', data:I.custototal, color:C.amber },
      { kind:'meter', value:64306, max:160000, color:C.teal },
    ],
    riskfactors: [
      { kind:'meter', value:24.3, max:30, color:C.red },
      { kind:'line', data:V.excessoPeso, color:C.amber },
      { kind:'meter', value:9.4, max:25, color:C.amber },
      { kind:'meter', value:20.4, max:30, color:C.purple },
      { kind:'meter', value:11.5, max:30, color:C.green },
      { kind:'line', data:V.hipertensao, color:C.purple },
    ],
    vigitel: [
      { kind:'meter', value:5.5, max:13, color:C.blue },
      { kind:'meter', value:6.9, max:13, color:C.blue },
      { kind:'meter', value:7.8, max:13, color:C.blue },
      { kind:'meter', value:8.1, max:13, color:C.blue },
      { kind:'meter', value:10.3, max:13, color:C.blue },
      { kind:'meter', value:12.9, max:13, color:C.blue },
    ],
    pns: [
      { kind:'line', data:P.total, color:C.blue },
      { kind:'meter', value:12, max:17, color:C.blue },
      { kind:'meter', value:28, max:30, color:C.red },
      { kind:'meter', value:30, max:36, color:C.teal },
      { kind:'meter', value:42, max:50, color:C.amber },
      { kind:'meter', value:27, max:30, color:C.purple },
    ],
    ml: (function(){
      // INTENCIONAL: só os 6 KPIs da 1ª linha (métricas do classificador ao vivo)
      // recebem meter. Os 6 da 2ª linha (R², n, AUC dos modelos estatístico/PNS) são
      // saídas calculadas ao vivo e não são proporções 0–100 — ficam sem meter de propósito.
      const m = (typeof ML !== 'undefined' && ML.trained) ? ML.metrics : null;
      const g = (v, fb) => m ? v : fb;
      return [
        { kind:'meter', value: g(m&&m.auc*100, 84),  max:100, color:C.blue },
        { kind:'meter', value: g(m&&m.acc*100, 85),  max:100, color:C.blue },
        { kind:'meter', value: g(m&&m.prec*100,70),  max:100, color:C.amber },
        { kind:'meter', value: g(m&&m.rec*100, 78),  max:100, color:C.green },
        { kind:'meter', value: g(m&&m.f1*100,  74),  max:100, color:C.amber },
        { kind:'meter', value: g(m&&m.spec*100,88),  max:100, color:C.green },
      ];
    })(),
  };
}

function injectKpiSparks(tabId) {
  const cfgs = kpiSparkConfig()[tabId];
  if (!cfgs) return;
  const cards = document.querySelectorAll(`#tab-${tabId} .kpi-card`);
  cards.forEach((card, i) => {
    const cfg = cfgs[i];
    if (!cfg) return;
    let holder = card.querySelector('.kpi-spark, .kpi-meter-holder');
    if (!holder) {
      holder = document.createElement('div');
      card.appendChild(holder);
    }
    if (cfg.kind === 'meter') {
      holder.className = 'kpi-meter-holder';
      const pct = Math.max(4, Math.min(100, cfg.value / cfg.max * 100));
      holder.innerHTML = `<div class="kpi-meter"><div class="kpi-meter-fill" style="width:${pct}%;background:${cfg.color}"></div></div>`;
    } else {
      holder.className = 'kpi-spark';
      const cid = `spark_${tabId}_${i}`;
      holder.innerHTML = `<canvas id="${cid}"></canvas>`;
      destroyChart(cid);
      const isLine = cfg.kind === 'line';
      saveChart(cid, new Chart(document.getElementById(cid), {
        type: cfg.kind,
        data: { labels: cfg.data.map((_,k)=>k), datasets: [{
          data: cfg.data,
          borderColor: cfg.color,
          backgroundColor: cfg.colors || (isLine ? hexA(cfg.color, .15) : cfg.color),
          fill: isLine,
          borderWidth: 2,
          tension: .4,
          pointRadius: 0,
          borderRadius: isLine ? 0 : 2,
          barPercentage: .9,
          categoryPercentage: .9,
        }]},
        options: sparkOpts(),
      }));
    }
  });
}

// Mini-gráficos (sparklines) dos cartões analíticos
function sparkOpts(extra) {
  return Object.assign({
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display:false }, tooltip: { enabled:false } },
    scales: { x: { display:false }, y: { display:false } },
    elements: { point: { radius: 0 } },
    animation: { duration: 600 },
  }, extra || {});
}

function renderAnaliseMinis() {
  const V = DATA.vigitel2024, E = DATA.estadosPrevalencia;   // dado oficial real
  const yi = yrIdx(V.years), si = stIdx();
  const v = { years: yi.map(i=>V.years[i]), diabetes: yi.map(i=>V.diabetes[i]), obesidade: yi.map(i=>V.excessoPeso[i]) };
  const e = { estados: si.map(i=>E.estados[i]), prev: si.map(i=>E.prev[i]), mort: si.map(i=>E.mort[i]), pop: si.map(i=>E.pop[i]) };

  // 1. scatter Obesidade × Diabetes
  let id = 'miniCorrObDi'; destroyChart(id);
  saveChart(id, new Chart(document.getElementById(id), {
    type:'scatter',
    data:{ datasets:[{ data: v.obesidade.map((o,i)=>({x:o,y:v.diabetes[i]})), backgroundColor: PALETTE.blue, pointRadius:3 }] },
    options: sparkOpts(),
  }));

  // 2. scatter Prevalência × Mortalidade
  id = 'miniCorrPrevMort'; destroyChart(id);
  saveChart(id, new Chart(document.getElementById(id), {
    type:'scatter',
    data:{ datasets:[{ data: e.prev.map((p,i)=>({x:p,y:e.mort[i]})), backgroundColor: PALETTE.teal, pointRadius:3 }] },
    options: sparkOpts(),
  }));

  // 3. gauge R²
  id = 'miniR2'; destroyChart(id);
  const r2 = Stats.linreg(v.years, v.diabetes).r2;
  saveChart(id, new Chart(document.getElementById(id), {
    type:'doughnut',
    data:{ datasets:[{ data:[r2, 1-r2], backgroundColor:[PALETTE.blue, '#e2e8f0'], borderWidth:0 }] },
    options: { responsive:true, maintainAspectRatio:false, cutout:'72%', rotation:-90, circumference:180,
      plugins:{ legend:{display:false}, tooltip:{enabled:false} }, animation:{duration:600} },
  }));

  // 4. sparkline CAGR (série de prevalência)
  id = 'miniCagr'; destroyChart(id);
  saveChart(id, new Chart(document.getElementById(id), {
    type:'line',
    data:{ labels: v.years, datasets:[{ data: v.diabetes, borderColor: PALETTE.amber, backgroundColor:'rgba(245,158,11,.15)', fill:true, borderWidth:2, tension:.4 }] },
    options: sparkOpts(),
  }));

  // 5. mini barras — top 6 estados por carga
  id = 'miniCases'; destroyChart(id);
  const burden = e.estados.map((uf,i)=>({ uf, c:(e.prev[i]/100)*e.pop[i] })).sort((a,b)=>b.c-a.c).slice(0,6);
  saveChart(id, new Chart(document.getElementById(id), {
    type:'bar',
    data:{ labels: burden.map(b=>b.uf), datasets:[{ data: burden.map(b=>+b.c.toFixed(2)), backgroundColor: PALETTE.purple, borderRadius:2 }] },
    options: sparkOpts({ scales:{ x:{ display:true, grid:{display:false}, ticks:{ font:{size:8}, color:'#94a3b8' } }, y:{ display:false } } }),
  }));

  // 6. distribuição ordenada da prevalência por UF
  id = 'miniDispersion'; destroyChart(id);
  const sorted = [...e.prev].sort((a,b)=>a-b);
  const m = Stats.mean(e.prev);
  saveChart(id, new Chart(document.getElementById(id), {
    type:'bar',
    data:{ labels: sorted.map((_,i)=>i), datasets:[{ data: sorted, backgroundColor: sorted.map(v=> v>=m?PALETTE.red+'cc':PALETTE.blue+'aa'), borderRadius:1, barPercentage:1, categoryPercentage:1 }] },
    options: sparkOpts({ scales:{ x:{display:false}, y:{ display:false, min:6 } } }),
  }));
}

function renderStatsTable() {
  const tbody = document.getElementById('statsTableBody'); if (!tbody) return;
  const idx = stIdx(), E = DATA.estadosPrevalencia;
  const series = [
    { nome:'Prevalência DM por UF (%)',        a: idx.map(i=>E.prev[i]), dec:1 },
    { nome:'Mortalidade por UF (/100k)',        a: idx.map(i=>E.mort[i]), dec:1 },
    { nome:'Prevalência DM Vigitel (%) 2006–24',a: DATA.vigitel2024.diabetes,    dec:1 },
    { nome:'Excesso de peso Vigitel (%) 2006–24',a: DATA.vigitel2024.excessoPeso, dec:1 },
    { nome:'Hipertensão Vigitel (%) 2006–24',   a: DATA.vigitel2024.hipertensao, dec:1 },
    { nome:'Óbitos DM/ano (SIM) 2000–24',       a: DATA.mortalidade.obitos,      dec:0 },
    { nome:'Internações/ano (SIH) 2010–24',     a: DATA.internacoes.total,       dec:0 },
  ];
  tbody.innerHTML = series.map(s => {
    const f = (x)=> s.dec===0 ? Math.round(x).toLocaleString('pt-BR') : x.toFixed(s.dec);
    return `<tr>
      <td style="text-align:left">${s.nome}</td>
      <td>${s.a.length}</td>
      <td>${f(Stats.mean(s.a))}</td>
      <td>${f(Stats.median(s.a))}</td>
      <td>${f(Stats.std(s.a))}</td>
      <td>${Stats.cv(s.a).toFixed(1)}</td>
      <td>${f(Stats.min(s.a))}</td>
      <td>${f(Stats.max(s.a))}</td>
    </tr>`;
  }).join('');
}

// ─────────────────────────────────────────────────────────────
// SÍNTESE & CONCLUSÕES — hipóteses avaliadas ao vivo
// ─────────────────────────────────────────────────────────────
function renderSintese() {
  const V = DATA.vigitel2024, E = DATA.estadosPrevalencia;   // dado oficial real
  const BADGE = { ok:['hyp-badge hyp-ok','Confirmada'], part:['hyp-badge hyp-part','Parcial'], no:['hyp-badge hyp-no','Refutada'] };
  const setBadge = (id, st) => { const el = document.getElementById(id); if (el) { el.className = BADGE[st][0]; el.textContent = BADGE[st][1]; } };

  // H1 — tendência temporal (OLS + teste t do coeficiente)
  const reg = Stats.linreg(V.years, V.diabetes);
  const rT = Stats.pearson(V.years, V.diabetes), pT = Stats.corrP(rT, V.years.length);
  setText('h1Stat', `inclinação = +${reg.slope.toFixed(3)} pp/ano · R² = ${reg.r2.toFixed(3)} · ${fmtP(pT)}`);
  setBadge('h1Badge', (reg.slope > 0 && pT < 0.05) ? 'ok' : 'no');

  // H2 — excesso de peso × diabetes (Pearson + p)
  const rOD = Stats.pearson(V.excessoPeso, V.diabetes), pOD = Stats.corrP(rOD, V.excessoPeso.length);
  setText('h2Stat', `r = ${rOD.toFixed(3)} · ${fmtP(pOD)} · n = ${V.excessoPeso.length}`);
  setBadge('h2Badge', (rOD >= 0.7 && pOD < 0.05) ? 'ok' : (rOD >= 0.4 && pOD < 0.05 ? 'part' : 'no'));
  setText('achadoR', 'r = ' + rOD.toFixed(2));

  // H3 — prevalência × mortalidade por UF (significativa, mas ecológica → no máximo "parcial")
  const rPM = Stats.pearson(E.prev, E.mort), pPM = Stats.corrP(rPM, E.prev.length);
  setText('h3Stat', `r = ${rPM.toFixed(3)} · ${fmtP(pPM)} · n = ${E.prev.length} UFs (dado agregado)`);
  setBadge('h3Badge', (rPM > 0 && pPM < 0.05) ? 'part' : 'no');

  // H4 — AUC do modelo treinado
  if (typeof ML !== 'undefined') {
    if (!ML.trained) ML.train();
    const auc = ML.metrics.auc;
    setText('h4Stat', `AUC = ${auc.toFixed(3)} (teste, n = ${ML.metrics.nTest})`);
    setBadge('h4Badge', auc > 0.75 ? 'ok' : (auc > 0.70 ? 'part' : 'no'));
    setText('achadoAuc', auc.toFixed(3).replace('.', ','));

    // H5 — preditores dominantes (coeficientes padronizados)
    const pairs = ML.featNames.map((n, j) => ({ n, w: Math.abs(ML.weights[j]) })).sort((a, b) => b.w - a.w);
    setText('h5Stat', `top preditores: ${pairs[0].n} e ${pairs[1].n}`);
    const top3 = pairs.slice(0, 3).map(p => p.n);
    const glic = top3.includes('Glicose'), imc = top3.includes('IMC');
    setBadge('h5Badge', (glic && imc) ? 'ok' : (glic || imc ? 'part' : 'no'));
  }
}

// ─────────────────────────────────────────────────────────────
// MODELO ECOLÓGICO (nível populacional) — usa TODAS as séries agregadas
// ─────────────────────────────────────────────────────────────
function renderEcological() {
  const V = DATA.vigitel2024;                       // dado oficial real 2006–2024
  const preds = [
    { key: 'excessoPeso', nome: 'Excesso de peso' },
    { key: 'hipertensao', nome: 'Hipertensão' },
  ];
  const X = V.years.map((_, i) => preds.map(p => V[p.key][i]));
  const y = V.diabetes.slice();
  const m = olsMulti(X, y);
  const rmse = loocvRMSE(X, y);

  setText('ecoR2', m.r2.toFixed(3).replace('.', ','));
  setText('ecoAdj', m.adj.toFixed(3).replace('.', ','));
  setText('ecoRmse', rmse.toFixed(2).replace('.', ',') + ' pp');

  // Observado vs previsto ao longo dos anos
  let id = 'chartEco'; destroyChart(id);
  saveChart(id, new Chart(document.getElementById(id), {
    type: 'line',
    data: {
      labels: V.years,
      datasets: [
        { label: 'Observado', data: y, borderColor: PALETTE.blue, backgroundColor: 'rgba(0,114,178,.08)', fill: false, tension: .3, borderWidth: 2.5, pointRadius: 3 },
        { label: 'Previsto (modelo)', data: m.yhat.map(v => +v.toFixed(2)), borderColor: PALETTE.red, borderDash: [6, 4], fill: false, tension: .3, borderWidth: 2, pointRadius: 2 },
      ],
    },
    options: { ...baseOpts({ display: false }),
      scales: {
        x: { grid: { color: GRID_COLOR }, ticks: { color: TICK_COLOR, font: { size: 10 }, maxRotation: 45, autoSkip: false } },
        y: { grid: { color: GRID_COLOR }, ticks: { color: TICK_COLOR, font: { size: 11 } }, title: { display: true, text: 'Prevalência DM (%)', color: TICK_COLOR, font: { size: 11 } } },
      },
      plugins: { ...baseOpts().plugins, tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.raw}%` } } }
    },
  }));

  // Coeficientes (com aviso de multicolinearidade)
  id = 'chartEcoCoef'; destroyChart(id);
  const cof = preds.map((p, j) => ({ nome: p.nome, b: m.beta[j + 1] }));
  saveChart(id, new Chart(document.getElementById(id), {
    type: 'bar', indexAxis: 'y',
    data: { labels: cof.map(c => c.nome), datasets: [{ label: 'Coeficiente', data: cof.map(c => +c.b.toFixed(3)),
      backgroundColor: cof.map(c => c.b >= 0 ? PALETTE.red + 'cc' : PALETTE.blue + 'cc'), borderRadius: 3 }] },
    options: { ...baseOpts(),
      scales: {
        y: { grid: { color: GRID_COLOR }, ticks: { color: TICK_COLOR, font: { size: 11 } } },
        x: { grid: { color: GRID_COLOR }, ticks: { color: TICK_COLOR, font: { size: 10 } }, title: { display: true, text: 'coeficiente (pp por unidade)', color: TICK_COLOR, font: { size: 10 } } },
      },
      plugins: { ...baseOpts().plugins, tooltip: { callbacks: { label: ctx => 'β = ' + ctx.raw } } }
    },
  }));
}

// ─────────────────────────────────────────────────────────────
// COMPARAÇÃO DE MODELOS — PNS 2019 (carregado de pns_results.js)
// ─────────────────────────────────────────────────────────────
let _pnsLoadTried = false;
function renderPnsComparison() {
  const host = document.getElementById('pnsComparison'); if (!host) return;
  if (window.PNS_RESULTS) { buildPnsComparison(window.PNS_RESULTS); return; }
  if (_pnsLoadTried) { showPnsPlaceholder(); return; }
  _pnsLoadTried = true;
  showPnsPlaceholder('Procurando resultados da PNS…');
  const s = document.createElement('script');
  s.src = 'pns_results.js?t=' + Date.now();
  s.onload = () => { window.PNS_RESULTS ? buildPnsComparison(window.PNS_RESULTS) : showPnsPlaceholder(); };
  s.onerror = () => showPnsPlaceholder();
  document.head.appendChild(s);
}

function showPnsPlaceholder(msg) {
  const host = document.getElementById('pnsComparison'); if (!host) return;
  if (msg) { host.innerHTML = `<div class="info-banner">${msg}</div>`; return; }
  host.innerHTML = `<div class="chart-note" style="font-size:13px">
    <i>Aguardando resultados da PNS.</i> Esta seção é preenchida com os números reais (Regressão Logística × Random Forest × XGBoost)
    assim que você rodar <code>notebooks/modelagem_pns.ipynb</code> — ele gera <code>pns_results.js</code> ao lado do <code>index.html</code>.
    Depois, recarregue esta página. Enquanto isso, o modelo individual de referência (acima) roda sobre o dataset Pima.</div>`;
}

function buildPnsComparison(d) {
  const host = document.getElementById('pnsComparison'); if (!host) return;
  const nomes = Object.keys(d.modelos);
  const melhor = Math.max(...nomes.map(n => d.modelos[n].auc_teste));
  const rows = nomes.map(n => {
    const m = d.modelos[n];
    return `<tr><td style="text-align:left">${n}</td><td>${m.auc_cv_media} ± ${m.auc_cv_dp}</td><td>${m.auc_teste}</td><td>${m.f1_teste}</td></tr>`;
  }).join('');
  host.innerHTML = `
    <div class="kpi-grid">
      <div class="kpi-card"><span class="kpi-label">Amostra (n)</span><span class="kpi-value">${Number(d.n_amostra).toLocaleString('pt-BR')}</span><span class="kpi-sub">${d.fonte}</span></div>
      <div class="kpi-card"><span class="kpi-label">Prevalência amostral</span><span class="kpi-value">${d.prevalencia_amostral_pct}%</span><span class="kpi-sub">DM autorreferido</span></div>
      <div class="kpi-card"><span class="kpi-label">Melhor AUC (teste)</span><span class="kpi-value">${melhor.toFixed(3).replace('.', ',')}</span><span class="kpi-sub">entre os 3 modelos</span></div>
    </div>
    <div class="charts-row">
      <div class="chart-card">
        <h3>AUC por modelo (validação cruzada k=5 vs. teste)</h3>
        <p class="chart-src">Fonte: ${d.fonte}</p>
        <div style="position:relative;height:280px"><canvas id="chartPnsAuc" role="img" aria-label="AUC por modelo na PNS"></canvas></div>
      </div>
      <div class="chart-card">
        <h3>Importância das variáveis (Random Forest)</h3>
        <p class="chart-src">PNS 2019 — população brasileira</p>
        <div style="position:relative;height:280px"><canvas id="chartPnsImp" role="img" aria-label="Importância das variáveis na PNS"></canvas></div>
      </div>
    </div>
    <div class="table-section">
      <h3>Métricas comparativas</h3>
      <table class="data-table"><thead><tr><th>Modelo</th><th>AUC (CV: média ± dp)</th><th>AUC (teste)</th><th>F1 (teste)</th></tr></thead><tbody>${rows}</tbody></table>
      <p style="font-size:11px;color:var(--ink-3);margin-top:8px">Números reais gerados por <code>notebooks/modelagem_pns.ipynb</code> sobre os microdados da PNS 2019 (IBGE/Fiocruz).</p>
    </div>`;

  destroyChart('chartPnsAuc');
  saveChart('chartPnsAuc', new Chart(document.getElementById('chartPnsAuc'), {
    type: 'bar',
    data: { labels: nomes, datasets: [
      { label: 'AUC (CV)', data: nomes.map(n => d.modelos[n].auc_cv_media), backgroundColor: PALETTE.blue + 'cc', borderRadius: 4 },
      { label: 'AUC (teste)', data: nomes.map(n => d.modelos[n].auc_teste), backgroundColor: PALETTE.green + 'cc', borderRadius: 4 },
    ]},
    options: { ...baseOpts({ display: true, position: 'top', labels: { font: { size: 10 }, color: TICK_COLOR } }),
      scales: { x: { grid: { color: GRID_COLOR }, ticks: { color: TICK_COLOR, font: { size: 10 } } },
        y: { grid: { color: GRID_COLOR }, ticks: { color: TICK_COLOR, font: { size: 11 } }, min: 0.5, max: 1, title: { display: true, text: 'AUC', color: TICK_COLOR, font: { size: 11 } } } } }
  }));

  const imp = d.importancia_rf || {};
  const ik = Object.keys(imp).sort((a, b) => imp[b] - imp[a]);
  destroyChart('chartPnsImp');
  saveChart('chartPnsImp', new Chart(document.getElementById('chartPnsImp'), {
    type: 'bar', indexAxis: 'y',
    data: { labels: ik, datasets: [{ label: 'Importância', data: ik.map(k => imp[k]), backgroundColor: PALETTE.purple + 'cc', borderRadius: 3 }] },
    options: { ...baseOpts(), scales: {
      y: { grid: { color: GRID_COLOR }, ticks: { color: TICK_COLOR, font: { size: 11 } } },
      x: { grid: { color: GRID_COLOR }, ticks: { color: TICK_COLOR, font: { size: 10 } }, title: { display: true, text: 'importância (RF)', color: TICK_COLOR, font: { size: 10 } } } } }
  }));
}

// ─────────────────────────────────────────────────────────────
// MACHINE LEARNING
// ─────────────────────────────────────────────────────────────

// Forecast com intervalo de confiança 95% (mean response, t≈2.12 p/ df=16)
function renderForecastCI() {
  const id = 'chartForecastCI'; destroyChart(id);
  const d = DATA.vigitel2024;                       // dado oficial real 2006–2024
  const years = d.years, y = d.diabetes, n = years.length;
  const reg = Stats.linreg(years, y);
  const mx = Stats.mean(years);
  const Sxx = years.reduce((s,xi)=> s+(xi-mx)**2, 0);
  // erro padrão da regressão
  let sse = 0; years.forEach((xi,i)=> sse += (y[i]-reg.predict(xi))**2);
  const s = Math.sqrt(sse/(n-2));
  const tval = 2.12; // t crítico 95%, df=16
  const future = [2025,2026,2027,2028,2029,2030,2031,2032,2033,2034,2035];
  const allYears = [...years, ...future];

  const H = n;
  const obs  = [...y, ...future.map(()=>null)];
  const trend = allYears.map(yr => +reg.predict(yr).toFixed(2));   // reta OLS em todo o período
  const seFit = yr => s * Math.sqrt(1/n + (yr-mx)**2/Sxx);
  const upper = allYears.map(yr => +(reg.predict(yr) + tval*seFit(yr)).toFixed(2));
  const lower = allYears.map(yr => +(reg.predict(yr) - tval*seFit(yr)).toFixed(2));

  setText('forecastCiEq', `ŷ = ${reg.slope.toFixed(3)}·ano ${reg.intercept<0?'−':'+'} ${Math.abs(reg.intercept).toFixed(1)} · R² = ${reg.r2.toFixed(3)} · s = ${s.toFixed(2)}`);

  saveChart(id, new Chart(document.getElementById(id), {
    type:'line',
    data:{ labels: allYears, datasets:[
      { label:'IC sup', data: upper, borderColor:'transparent', pointRadius:0, fill:false },
      { label:'IC 95%', data: lower, borderColor:'transparent', pointRadius:0, fill:'-1', backgroundColor:'rgba(231,76,60,.15)' },
      { label:'Observado', data: obs, borderColor: PALETTE.blue, backgroundColor:'rgba(26,86,219,.08)', fill:false, tension:.3, borderWidth:2.5, pointRadius:3 },
      { label:'Tendência + Projeção (OLS)', data: trend, borderColor: PALETTE.red, fill:false, tension:0, borderWidth:2,
        pointRadius: ctx => ctx.dataIndex >= H ? 3 : 0, pointStyle:'rectRot',
        segment:{ borderDash: ctx => ctx.p0DataIndex >= H-1 ? [6,4] : undefined } },
    ]},
    options:{ ...baseOpts({ display:false }),
      scales:{
        x:{ grid:{color:GRID_COLOR}, ticks:{color:TICK_COLOR, font:{size:10}, maxRotation:45, autoSkip:false} },
        y:{ grid:{color:GRID_COLOR}, ticks:{color:TICK_COLOR, font:{size:11}}, title:{display:true, text:'Prevalência (%)', color:TICK_COLOR, font:{size:11}}, min:4 },
      },
      plugins:{ ...baseOpts().plugins, tooltip:{ callbacks:{ label: ctx=> ctx.raw==null?null:`${ctx.dataset.label}: ${ctx.raw}%` } } }
    },
  }));
}

// Decomposição aditiva: tendência (MM 2x12), sazonal, resíduo
function decompose(series) {
  const N = series.length, trend = Array(N).fill(null);
  for (let t=6; t<=N-7; t++) {
    let sum = 0.5*series[t-6] + 0.5*series[t+6];
    for (let k=-5;k<=5;k++) sum += series[t+k];
    trend[t] = sum/12;
  }
  // detrended
  const detr = series.map((v,i)=> trend[i]==null ? null : v-trend[i]);
  // índice sazonal por mês
  const monthSums = Array(12).fill(0), monthCnt = Array(12).fill(0);
  detr.forEach((v,i)=>{ if (v!=null){ const m=i%12; monthSums[m]+=v; monthCnt[m]++; } });
  let seasonalIdx = monthSums.map((s,m)=> monthCnt[m] ? s/monthCnt[m] : 0);
  const meanSeasonal = Stats.mean(seasonalIdx);
  seasonalIdx = seasonalIdx.map(v=> v-meanSeasonal); // centra em 0
  const seasonal = series.map((_,i)=> seasonalIdx[i%12]);
  const resid = series.map((v,i)=> trend[i]==null ? null : +(v - trend[i] - seasonal[i]).toFixed(0));
  return { trend, seasonal, seasonalIdx, resid };
}

function monthLabels(startYear, n) {
  const out = [];
  for (let i=0;i<n;i++){ const yy = String(startYear + Math.floor(i/12)).slice(2); out.push(String(i%12+1).padStart(2,'0')+'/'+yy); }
  return out;
}

let _decompCache = null;
function getDecomp() {
  if (_decompCache) return _decompCache;
  const S = (typeof window !== 'undefined' && window.SERIE_MENSAL) ? window.SERIE_MENSAL : null;
  if (!S || !S.obs_valores) return null;          // série real ainda não carregada
  const s = S.obs_valores;
  const labels = S.obs_labels.map(l => l.slice(5, 7) + '/' + l.slice(2, 4)); // 2015-01 -> 01/15
  _decompCache = { series: s, labels, ...decompose(s) };
  return _decompCache;
}

function renderDecompMain() {
  const id = 'chartDecompMain'; destroyChart(id);
  const d = getDecomp(); if (!d) return;
  saveChart(id, new Chart(document.getElementById(id), {
    type:'line',
    data:{ labels: d.labels, datasets:[
      { label:'Observado', data: d.series, borderColor: PALETTE.gray, fill:false, tension:.25, borderWidth:1.5, pointRadius:0 },
      { label:'Tendência', data: d.trend, borderColor: PALETTE.blue, fill:false, tension:.25, borderWidth:2.5, pointRadius:0 },
    ]},
    options:{ ...baseOpts({ display:false }),
      scales:{
        x:{ grid:{color:GRID_COLOR}, ticks:{color:TICK_COLOR, font:{size:9}, maxRotation:45, autoSkip:true, maxTicksLimit:16} },
        y:{ grid:{color:GRID_COLOR}, ticks:{color:TICK_COLOR, font:{size:11}}, title:{display:true, text:'Óbitos/mês', color:TICK_COLOR, font:{size:11}} },
      },
      plugins:{ ...baseOpts().plugins, tooltip:{ callbacks:{ label: ctx=> ctx.raw==null?null:`${ctx.dataset.label}: ${Math.round(ctx.raw).toLocaleString('pt-BR')}` } } }
    },
  }));
}

function renderDecompSeasonal() {
  const id = 'chartDecompSeasonal'; destroyChart(id);
  const d = getDecomp(); if (!d) return;
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  saveChart(id, new Chart(document.getElementById(id), {
    type:'bar',
    data:{ labels: meses, datasets:[
      { label:'Índice sazonal', data: d.seasonalIdx.map(v=>+v.toFixed(0)), backgroundColor: d.seasonalIdx.map(v=> v>=0?PALETTE.red+'cc':PALETTE.blue+'cc'), borderRadius:3 },
    ]},
    options:{ ...baseOpts(),
      scales:{
        x:{ grid:{color:GRID_COLOR}, ticks:{color:TICK_COLOR, font:{size:10}} },
        y:{ grid:{color:GRID_COLOR}, ticks:{color:TICK_COLOR, font:{size:11}}, title:{display:true, text:'Desvio sazonal', color:TICK_COLOR, font:{size:11}} },
      },
      plugins:{ ...baseOpts().plugins, tooltip:{ callbacks:{ label: ctx=> (ctx.raw>=0?'+':'')+ctx.raw+' óbitos' } } }
    },
  }));
}

function renderDecompResid() {
  const id = 'chartDecompResid'; destroyChart(id);
  const d = getDecomp(); if (!d) return;
  // destaca anomalia COVID: abr-jun/2020 => índices 63-65 na série 2015-01..2020-12
  const cores = d.resid.map((v,i)=> (i>=63 && i<=65) ? PALETTE.amber : PALETTE.gray);
  saveChart(id, new Chart(document.getElementById(id), {
    type:'bar',
    data:{ labels: d.labels, datasets:[
      { label:'Resíduo', data: d.resid, backgroundColor: cores, borderRadius:2 },
    ]},
    options:{ ...baseOpts(),
      scales:{
        x:{ grid:{color:GRID_COLOR}, ticks:{color:TICK_COLOR, font:{size:9}, maxRotation:45, autoSkip:true, maxTicksLimit:16} },
        y:{ grid:{color:GRID_COLOR}, ticks:{color:TICK_COLOR, font:{size:11}}, title:{display:true, text:'Resíduo', color:TICK_COLOR, font:{size:11}} },
      },
      plugins:{ ...baseOpts().plugins, tooltip:{ callbacks:{ label: ctx=> ctx.raw==null?null:(ctx.raw>=0?'+':'')+ctx.raw } } }
    },
  }));
}

// Previsão SARIMA da série mensal real (window.SERIE_MENSAL)
function renderSarima() {
  const id = 'chartSarima'; destroyChart(id);
  const S = (typeof window !== 'undefined') ? window.SERIE_MENSAL : null;
  if (!S || !S.fc_mean) { setText('sarimaCap', 'Série/previsão não carregadas (rode notebooks/rodar_sarima.py).'); return; }
  const nObs = S.obs_valores.length, nFc = S.fc_mean.length;
  const fmt = l => l.slice(5, 7) + '/' + l.slice(2, 4);
  const labels = S.obs_labels.map(fmt).concat(S.fc_labels.map(fmt));
  const obs  = S.obs_valores.concat(new Array(nFc).fill(null));
  const mean = new Array(nObs - 1).fill(null).concat([S.obs_valores[nObs - 1]], S.fc_mean);
  const hi   = new Array(nObs).fill(null).concat(S.fc_hi);
  const lo   = new Array(nObs).fill(null).concat(S.fc_lo);

  setText('sarimaCap', `${S.modelo} · AIC ${S.aic} · backtest 12 meses: MAPE ${String(S.backtest.mape_pct).replace('.', ',')}%`);

  saveChart(id, new Chart(document.getElementById(id), {
    type: 'line',
    data: { labels, datasets: [
      { label: 'IC sup', data: hi, borderColor: 'transparent', pointRadius: 0, fill: false },
      { label: 'IC 95%', data: lo, borderColor: 'transparent', pointRadius: 0, fill: '-1', backgroundColor: 'rgba(213,94,0,.15)' },
      { label: 'Observado', data: obs, borderColor: PALETTE.blue, fill: false, tension: .25, borderWidth: 2, pointRadius: 0 },
      { label: 'Previsão SARIMA', data: mean, borderColor: PALETTE.red, borderDash: [5, 3], fill: false, tension: .25, borderWidth: 2, pointRadius: 0 },
    ]},
    options: { ...baseOpts({ display: false }),
      scales: {
        x: { grid: { color: GRID_COLOR }, ticks: { color: TICK_COLOR, font: { size: 9 }, maxRotation: 45, autoSkip: true, maxTicksLimit: 14 } },
        y: { grid: { color: GRID_COLOR }, ticks: { color: TICK_COLOR, font: { size: 11 } }, title: { display: true, text: 'Óbitos/mês', color: TICK_COLOR, font: { size: 11 } } },
      },
      plugins: { ...baseOpts().plugins, tooltip: { callbacks: { label: ctx => ctx.raw == null ? null : `${ctx.dataset.label}: ${Math.round(ctx.raw).toLocaleString('pt-BR')}` } } }
    },
  }));
}

function renderROC() {
  const id = 'chartROC'; destroyChart(id);
  if (!ML.trained) ML.train();
  const roc = ML.roc.map(p=>({x:p[0], y:p[1]}));
  setText('rocAuc', 'AUC = ' + ML.metrics.auc.toFixed(3).replace('.', ','));
  saveChart(id, new Chart(document.getElementById(id), {
    type:'line',
    data:{ datasets:[
      { label:'ROC', data: roc, borderColor: PALETTE.blue, backgroundColor:'rgba(26,86,219,.12)', fill:true, tension:.2, borderWidth:2.5, pointRadius:2 },
      { label:'Aleatório', data:[{x:0,y:0},{x:1,y:1}], borderColor: PALETTE.gray, borderDash:[5,4], borderWidth:1.5, pointRadius:0, fill:false },
    ]},
    options:{ ...baseOpts({ display:false }),
      scales:{
        x:{ type:'linear', min:0, max:1, grid:{color:GRID_COLOR}, ticks:{color:TICK_COLOR, font:{size:11}}, title:{display:true, text:'1 − Especificidade (FPR)', color:TICK_COLOR, font:{size:11}} },
        y:{ min:0, max:1, grid:{color:GRID_COLOR}, ticks:{color:TICK_COLOR, font:{size:11}}, title:{display:true, text:'Sensibilidade (TPR)', color:TICK_COLOR, font:{size:11}} },
      },
      plugins:{ ...baseOpts().plugins, tooltip:{ callbacks:{ label: ctx=> `FPR ${ctx.raw.x.toFixed(2)} · TPR ${ctx.raw.y.toFixed(2)}` } } }
    },
  }));
}

// KPIs + coeficientes do modelo treinado
function renderMlMetrics() {
  if (!ML.trained) ML.train();
  const m = ML.metrics;
  const pct = v => (v*100).toFixed(1).replace('.', ',') + '%';
  setText('mlAuc', m.auc.toFixed(3).replace('.', ','));
  setText('mlAcc', pct(m.acc));
  setText('mlPrec', pct(m.prec));
  setText('mlRec', pct(m.rec));
  setText('mlF1', m.f1.toFixed(3).replace('.', ','));
  setText('mlSpec', pct(m.spec));

  // gráfico de coeficientes aprendidos
  const id = 'chartCoef'; destroyChart(id);
  const pairs = ML.featNames.map((n,j)=>({ n, w: ML.weights[j] })).sort((a,b)=> Math.abs(b.w)-Math.abs(a.w));
  saveChart(id, new Chart(document.getElementById(id), {
    type:'bar', indexAxis:'y',
    data:{ labels: pairs.map(p=>p.n), datasets:[
      { label:'Peso padronizado', data: pairs.map(p=>+p.w.toFixed(3)),
        backgroundColor: pairs.map(p=> p.w>=0 ? PALETTE.red+'cc' : PALETTE.blue+'cc'), borderRadius:3 },
    ]},
    options:{ ...baseOpts(),
      scales:{
        y:{ grid:{color:GRID_COLOR}, ticks:{color:TICK_COLOR, font:{size:11}} },
        x:{ grid:{color:GRID_COLOR}, ticks:{color:TICK_COLOR, font:{size:11}}, title:{display:true, text:'coeficiente (log-odds, padronizado)', color:TICK_COLOR, font:{size:11}} },
      },
      plugins:{ ...baseOpts().plugins, tooltip:{ callbacks:{ label: ctx=> 'peso = '+ctx.raw } } }
    },
  }));
}

function renderConfMatrix() {
  const el = document.getElementById('confMatrix'); if (!el) return;
  if (!ML.trained) ML.train();
  const m = ML.confusion;
  setText('confN', `(n = ${ML.metrics.nTest} no teste)`);
  el.innerHTML = `
    <div class="cm-cell cm-corner"></div>
    <div class="cm-cell cm-head">Predito: Positivo</div>
    <div class="cm-cell cm-head">Predito: Negativo</div>
    <div class="cm-cell cm-head">Real: Positivo</div>
    <div class="cm-cell cm-tp"><span class="cm-val">${m.TP}</span><span class="cm-lbl">VP (acerto)</span></div>
    <div class="cm-cell cm-fn"><span class="cm-val">${m.FN}</span><span class="cm-lbl">FN (erro)</span></div>
    <div class="cm-cell cm-head">Real: Negativo</div>
    <div class="cm-cell cm-fp"><span class="cm-val">${m.FP}</span><span class="cm-lbl">FP (erro)</span></div>
    <div class="cm-cell cm-tn"><span class="cm-val">${m.TN}</span><span class="cm-lbl">VN (acerto)</span></div>`;
}

// Classificador interativo — usa o modelo REALMENTE treinado (ML.predictRaw)
function computeRisk() {
  if (!ML.trained) ML.train();
  const get = id => document.getElementById(id);
  // ordem das features = colunas do Pima: Gravidezes,Glicose,Pressao,Pele,Insulina,IMC,Pedigree,Idade
  const gravidezes = +get('inGravidezes').value;
  const glicose    = +get('inGlicose').value;
  const pressao    = +get('inPressao').value;
  const pele       = +get('inPele').value;
  const insulina   = +get('inInsulina').value;
  const imc        = +get('inImc').value;
  const pedigree   = +get('inPedigree').value;
  const idade      = +get('inIdade').value;

  setText('outGravidezes', gravidezes);
  setText('outGlicose', glicose);
  setText('outPressao', pressao);
  setText('outPele', pele);
  setText('outInsulina', insulina);
  setText('outImc', imc.toFixed(1).replace('.', ','));
  setText('outPedigree', pedigree.toFixed(2).replace('.', ','));
  setText('outIdade', idade);

  const raw = [gravidezes, glicose, pressao, pele, insulina, imc, pedigree, idade];
  const out = ML.predictRaw(raw);
  const prob = out.prob, pct = prob*100;

  setText('riskProb', pct.toFixed(1).replace('.', ',')+'%');
  const badge = get('riskCat');
  let cat, cls;
  if (prob < 0.30) { cat='Baixo'; cls='baixo'; }
  else if (prob < 0.60) { cat='Moderado'; cls='moderado'; }
  else { cat='Alto'; cls='alto'; }
  badge.textContent = cat;
  badge.className = 'cat-badge ' + cls;
  get('gaugeFill').style.width = (100-pct) + '%';

  // explicabilidade: contribuição (log-odds) real de cada feature, ordenada
  const id = 'chartContrib'; destroyChart(id);
  const pairs = ML.featNames.map((n,j)=>({ n, v: out.contrib[j] }))
    .sort((a,b)=> Math.abs(b.v)-Math.abs(a.v));
  saveChart(id, new Chart(document.getElementById(id), {
    type:'bar', indexAxis:'y',
    data:{ labels: pairs.map(p=>p.n), datasets:[
      { label:'Contribuição (log-odds)', data: pairs.map(p=>+p.v.toFixed(2)),
        backgroundColor: pairs.map(p=> p.v>=0 ? PALETTE.red+'cc' : PALETTE.blue+'cc'), borderRadius:3 },
    ]},
    options:{ ...baseOpts(),
      scales:{
        y:{ grid:{color:GRID_COLOR}, ticks:{color:TICK_COLOR, font:{size:10}} },
        x:{ grid:{color:GRID_COLOR}, ticks:{color:TICK_COLOR, font:{size:10}}, title:{display:true, text:'log-odds (↑ risco / ↓ proteção)', color:TICK_COLOR, font:{size:10}} },
      },
      plugins:{ ...baseOpts().plugins, tooltip:{ callbacks:{ label: ctx=> (ctx.raw>=0?'+':'')+ctx.raw+' no logit' } } }
    },
  }));
}

// ─────────────────────────────────────────────────────────────
// RENDER ALL (called on tab switch)
// ─────────────────────────────────────────────────────────────
const TAB_RENDERERS = {
  overview: () => {
    renderOverviewTrend();
    renderAgeGroup();
    renderGlobalProjection();
    renderTopCountries();
  },
  prevalence: () => {
    renderStatePrevalence();
    renderEducation();
    renderSexAge();
    renderSexTrend();
  },
  mortality: () => {
    renderMortalityTrend();
    renderMortalityAge();
    renderMortalityRegion();
    renderMortalityCid();
    renderMortalityComparison();
  },
  hospitalization: () => {
    renderHospTrend();
    renderHospComplication();
    renderHospSexAge();
    renderAmputations();
  },
  riskfactors: () => {
    renderObesityDiabetes();
    renderSedentary();
    renderDiet();
  },
  geographic: () => {
    renderStateComparison();
    if (typeof renderBrazilMap === 'function') renderBrazilMap();
  },
  vigitel: () => {
    renderVigitelAll();
    renderVigitelCidades();
  },
  pns: () => {
    renderFontesComp();
    renderPnsEvol();
    renderPnsRegiao();
    renderIdfEdicoes();
    renderCustoBrasil();
  },
  analise: () => {
    renderForecast();
    renderScatterObDi();
    renderScatterPrevMort();
    renderCorrHeatmap();
    renderDistRegion();
    renderBubble();
    renderBurden();
    renderStatsTable();
    renderAnaliseMinis();
  },
  sintese: () => {
    renderSintese();
  },
  ml: () => {
    if (!ML.trained) ML.train();
    renderMlMetrics();
    renderEcological();
    renderPnsComparison();
    renderForecastCI();
    renderDecompMain();
    renderDecompSeasonal();
    renderDecompResid();
    renderSarima();
    renderConfMatrix();
    renderROC();
    computeRisk();
  },
};

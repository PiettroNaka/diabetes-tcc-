// ─────────────────────────────────────────────────────────────────────────────
// Reprodução dos resultados do TCC a partir dos dados versionados no repositório
//
// Recalcula os números apresentados no Capítulo 6 (Resultados) e no painel:
// testes das hipóteses H1–H5, verificações de robustez, perfis da mortalidade e
// das internações, decomposição da série mensal e métricas dos modelos.
//
// Usa os MESMOS arquivos e as MESMAS funções estatísticas do painel (data.js,
// charts.js, ml.js...), carregados num contexto isolado do Node — não há uma
// segunda implementação que possa divergir da que roda no navegador.
//
// Uso (na raiz do repositório):
//   node reproducao/reproduzir_resultados.js                 → resumo no terminal
//   node reproducao/reproduzir_resultados.js resultados.json → também grava o JSON completo
// Requer apenas Node.js 18 ou superior; não acessa a rede.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const RAIZ = path.resolve(__dirname, '..');
const ler = f => fs.readFileSync(path.join(RAIZ, f), 'utf8').replace(/^﻿/, '');
// "const X =" no topo dos arquivos vira "var X =" para ficar visível no contexto
const comoVar = src => src.replace(/^const (\w+)\s*=/gm, 'var $1 =');

const ctx = { window: {}, Math, Array, console, document: { getElementById: () => null } };
vm.createContext(ctx);
['data.js', 'pima.js', 'ml.js', 'serie_mensal.js', 'pns_results.js']
  .forEach(f => vm.runInContext(comoVar(ler(f)), ctx, { filename: f }));

// Funções estatísticas do painel (charts.js): Stats, olsMulti, loocvRMSE,
// p-valor via beta incompleta e decomposição clássica (MM 2×12).
const charts = ler('charts.js');
const trecho = (re, nome) => {
  const m = charts.match(re);
  if (!m) throw new Error(`Trecho "${nome}" não encontrado em charts.js`);
  return m[0];
};
vm.runInContext(comoVar(trecho(/\/\/ FUNÇÕES ESTATÍSTICAS[\s\S]*?(?=\/\/ ── Distribuição t)/, 'Stats')), ctx);
vm.runInContext(trecho(/function _logGamma[\s\S]*?(?=function fmtP)/, 'beta incompleta'), ctx);
vm.runInContext('var decompose = ' + trecho(/function decompose\(series\) \{[\s\S]*?\n\}/, 'decompose'), ctx);

const D = ctx.DATA, S = ctx.Stats;
const r1 = v => Math.round(v * 10) / 10, r3 = v => Math.round(v * 1000) / 1000;
const soma = a => a.reduce((s, v) => s + v, 0);
const T_CRIT = 2.12; // t de Student, 95%, gl = 16 (18 anos do Vigitel; mesmo valor do painel)

const correl = (a, b) => {
  const r = S.pearson(a, b);
  return { r: r3(r), ic95: S.corrCI(r, a.length).map(r3), p: S.corrP(r, a.length), n: a.length };
};
const postos = a => { // postos médios (empates) para a correlação de Spearman
  const ord = a.map((v, i) => [v, i]).sort((x, y) => x[0] - y[0]);
  const r = Array(a.length);
  for (let i = 0; i < ord.length;) {
    let j = i;
    while (j + 1 < ord.length && ord[j + 1][0] === ord[i][0]) j++;
    for (let k = i; k <= j; k++) r[ord[k][1]] = (i + j) / 2 + 1;
    i = j + 1;
  }
  return r;
};
const R = {};

// ── H1: tendência da prevalência (Vigitel, capitais) ────────────────────────
const V = D.vigitel2024;
{
  const n = V.years.length, reg = S.linreg(V.years, V.diabetes);
  const mx = S.mean(V.years), sxx = soma(V.years.map(x => (x - mx) ** 2));
  const sse = soma(V.years.map((x, i) => (V.diabetes[i] - reg.predict(x)) ** 2));
  const s = Math.sqrt(sse / (n - 2)), ep = s / Math.sqrt(sxx);
  const rT = S.pearson(V.years, V.diabetes);
  const projecao = ano => {
    const yh = reg.predict(ano), h = T_CRIT * s * Math.sqrt(1 / n + (ano - mx) ** 2 / sxx);
    return { media: r1(yh), ic95: [r1(yh - h), r1(yh + h)] };
  };
  const fim = V.diabetes.length - 1;
  R.H1 = {
    inclinacao_pp_ano: r3(reg.slope),
    ic95: [r3(reg.slope - T_CRIT * ep), r3(reg.slope + T_CRIT * ep)],
    r2: r3(reg.r2), p: S.corrP(rT, n), n,
    prevalencia: { [V.years[0]]: V.diabetes[0], [V.years[fim]]: V.diabetes[fim] },
    tcac_pct: r3((Math.pow(V.diabetes[fim] / V.diabetes[0], 1 / (V.years[fim] - V.years[0])) - 1) * 100),
    residuo_ultimo_ano: r3(V.diabetes[fim] - reg.predict(V.years[fim])),
    projecao: { 2025: projecao(2025), 2030: projecao(2030), 2035: projecao(2035) },
  };
  const DM = D.vigitelDM;
  const trecho = cond => {
    const idx = DM.years.map((a, i) => (cond(a) ? i : -1)).filter(i => i >= 0);
    return r3(S.linreg(idx.map(i => DM.years[i]), idx.map(i => DM.total[i])).slope);
  };
  R.H1.inclinacao_2006_2019 = trecho(a => a <= 2019);
  R.H1.inclinacao_2019_2024 = trecho(a => a >= 2019);
}

// ── H2: excesso de peso × diabetes, com verificações de robustez ────────────
{
  const dif = a => a.slice(1).map((v, i) => v - a[i]);
  const semTendencia = a => {
    const g = S.linreg(V.years, a);
    return a.map((v, i) => v - g.predict(V.years[i]));
  };
  R.H2 = {
    pearson: correl(V.excessoPeso, V.diabetes),
    primeiras_diferencas: correl(dif(V.excessoPeso), dif(V.diabetes)),
    sem_tendencia_linear: correl(semTendencia(V.excessoPeso), semTendencia(V.diabetes)),
    hipertensao_x_diabetes: correl(V.hipertensao, V.diabetes),
    excesso_peso_x_hipertensao: correl(V.excessoPeso, V.hipertensao),
  };
  // modelo ecológico DIAB ~ EXC + HIP, LOOCV e colinearidade
  const X = V.years.map((_, i) => [V.excessoPeso[i], V.hipertensao[i]]);
  const m = ctx.olsMulti(X, V.diabetes);
  const rEH = S.pearson(V.excessoPeso, V.hipertensao);
  const n = V.years.length;
  let eTend = 0, eMedia = 0;
  for (let k = 0; k < n; k++) {
    const xs = V.years.filter((_, i) => i !== k), ys = V.diabetes.filter((_, i) => i !== k);
    eTend += (V.diabetes[k] - S.linreg(xs, ys).predict(V.years[k])) ** 2;
    eMedia += (V.diabetes[k] - S.mean(ys)) ** 2;
  }
  R.modelo_ecologico = {
    beta: m.beta.map(r3), r2: r3(m.r2), r2_ajustado: r3(m.adj), vif: r3(1 / (1 - rEH * rEH)),
    loocv_rmse: {
      ecologico: r3(ctx.loocvRMSE(X, V.diabetes)),
      tendencia_linear: r3(Math.sqrt(eTend / n)),
      media_constante: r3(Math.sqrt(eMedia / n)),
    },
  };
}

// ── H3: prevalência × mortalidade nas 27 UFs ─────────────────────────────────
{
  const E = D.estadosPrevalencia;
  const semDF = E.estados.map((_, i) => i).filter(i => E.estados[i] !== 'DF');
  R.H3 = {
    pearson: correl(E.prev, E.mort),
    spearman: correl(postos(E.prev), postos(E.mort)),
    pearson_sem_DF: correl(semDF.map(i => E.prev[i]), semDF.map(i => E.mort[i])),
  };
}

// ── Perfis da prevalência (Vigitel) ──────────────────────────────────────────
{
  const DM = D.vigitelDM, C = D.vigitelCidades;
  const ult = a => a[a.length - 1];
  R.prevalencia = {
    sexo: {
      masculino: [DM.masc[0], ult(DM.masc)], feminino: [DM.fem[0], ult(DM.fem)],
      razao_fem_masc_ultimo_ano: r3(ult(DM.fem) / ult(DM.masc)),
    },
    faixa_etaria: D.vigitelFaixaEtaria.labels.map((l, i) =>
      [l, D.vigitelFaixaEtaria.serie[i][0], ult(D.vigitelFaixaEtaria.serie[i]), D.vigitelFaixaEtaria.variacao[i]]),
    escolaridade: D.vigitelEscolaridade.labels.map((l, i) =>
      [l.replace('\n', ' '), D.vigitelEscolaridade.serie[i][0], ult(D.vigitelEscolaridade.serie[i]), D.vigitelEscolaridade.variacao[i]]),
  };
  const caps = C.capitais.map((c, i) => [c, C.prevalencia[i], C.regioes[i]]).sort((a, b) => b[1] - a[1]);
  R.capitais = {
    maiores: caps.slice(0, 5), menores: caps.slice(-5),
    media_dp_cv: [r3(S.mean(C.prevalencia)), r3(S.std(C.prevalencia)), r3(S.cv(C.prevalencia))],
    por_regiao: Object.fromEntries(['N', 'NE', 'CO', 'SE', 'S'].map(rg => {
      const v = caps.filter(c => c[2] === rg).map(c => c[1]);
      return [rg, { media: r1(S.mean(v)), min: Math.min(...v), max: Math.max(...v) }];
    })),
  };
}

// ── Mortalidade (SIM) ────────────────────────────────────────────────────────
{
  const M = D.mortalidade, ob = ano => M.obitos[M.anos.indexOf(ano)];
  const distrib = b => { const t = soma(b.obitos); return b.labels.map((l, i) => [l, b.obitos[i], r1(b.obitos[i] / t * 100)]); };
  const E = D.estadosPrevalencia;
  const ufs = E.estados.map((u, i) => [u, E.mort[i]]).sort((a, b) => b[1] - a[1]);
  R.mortalidade = {
    obitos: { 2000: ob(2000), 2019: ob(2019), 2020: ob(2020), 2021: ob(2021), 2025: ob(2025) },
    variacao_pct: {
      '2000-2025': r1((ob(2025) / ob(2000) - 1) * 100), '2019-2020': r3((ob(2020) / ob(2019) - 1) * 100),
      '2019-2021': r3((ob(2021) / ob(2019) - 1) * 100), '2021-2025': r3((ob(2025) / ob(2021) - 1) * 100),
    },
    faixa_etaria_2025: distrib(D.mortalidadeFaixaEtaria),
    raca_cor_2025: distrib(D.mortalidadeRaca),
    regiao_2025: D.mortalidadeRegiao,
    padronizada_por_idade: D.mortalidadePadronizada,
    cid10_2025: D.mortalidadeCID,
    uf_maiores_taxas: ufs.slice(0, 4), uf_menores_taxas: ufs.slice(-4),
  };
}

// ── Internações (SIH/SUS) ────────────────────────────────────────────────────
{
  const I = D.internacoes, ult = a => a[a.length - 1];
  const SF = D.internacoesSexoFaixa, A = D.amputacoesAnos;
  const fem = soma(SF.fem), masc = soma(SF.masc);
  R.internacoes = {
    total: { [I.anos[0]]: I.total[0], [ult(I.anos)]: ult(I.total) },
    custo_milhoes: { [I.anos[0]]: I.custototal[0], [ult(I.anos)]: ult(I.custototal) },
    variacao_pct: { internacoes: r1((ult(I.total) / I.total[0] - 1) * 100), custo: r1((ult(I.custototal) / I.custototal[0] - 1) * 100) },
    custo_medio_reais: { [I.anos[0]]: Math.round(I.custototal[0] * 1e6 / I.total[0]), [ult(I.anos)]: Math.round(ult(I.custototal) * 1e6 / ult(I.total)) },
    pct_masculino: r1(masc / (fem + masc) * 100),
    amputacoes: { [A.anos ? A.anos[0] : 'inicio']: A.total[0], [A.anos ? ult(A.anos) : 'fim']: ult(A.total), variacao_pct: r1((ult(A.total) / A.total[0] - 1) * 100) },
  };
}

// ── Série mensal: decomposição, SARIMA e referência ingênua sazonal ─────────
{
  const SM = ctx.window.SERIE_MENSAL, y = SM.obs_valores;
  const dc = ctx.decompose(y);
  const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const a19 = y.slice(48, 60), a20 = y.slice(60, 72);
  const mape = (p, o) => soma(o.map((v, i) => Math.abs(v - p[i]) / v)) / o.length * 100;
  const rmse = (p, o) => Math.sqrt(soma(o.map((v, i) => (v - p[i]) ** 2)) / o.length);
  const i21 = SM.fc_labels.map((l, i) => (l.startsWith('2021') ? i : -1)).filter(i => i >= 0);
  const prev2021 = [SM.fc_mean, SM.fc_lo, SM.fc_hi].map(s => Math.round(soma(i21.map(i => s[i]))));
  const obs2021 = D.mortalidade.obitos[D.mortalidade.anos.indexOf(2021)];
  R.serie_mensal = {
    indice_sazonal: dc.seasonalIdx.map((v, i) => [meses[i], Math.round(v)]),
    dp_residuo: Math.round(S.std(dc.resid.filter(v => v != null))),
    residuo_2020: SM.obs_labels.map((l, i) => [l, dc.resid[i]]).filter(x => x[0].startsWith('2020') && x[1] != null),
    sarima_publicado: { modelo: SM.modelo, aic: SM.aic, backtest_2020: SM.backtest },
    ingenuo_sazonal_2020: { mape_pct: r3(mape(a19, a20)), rmse: Math.round(rmse(a19, a20)) },
    validacao_externa_2021: { previsto_ic95: prev2021, observado: obs2021, erro_pct: r3((prev2021[0] - obs2021) / obs2021 * 100) },
  };
}

// ── H4 e H5: regressão logística (Pima) treinada como no navegador ──────────
{
  const ML = ctx.ML;
  ML.train();
  R.H4_H5_pima = {
    metricas: Object.fromEntries(Object.entries(ML.metrics).map(([k, v]) => [k, typeof v === 'number' ? r3(v) : v])),
    matriz_confusao: ML.confusion,
    coeficientes_padronizados: ML.featNames
      .map((nm, j) => ({ variavel: nm, coef: r3(ML.weights[j]), or_por_dp: r3(Math.exp(ML.weights[j])) }))
      .sort((a, b) => Math.abs(b.coef) - Math.abs(a.coef)),
    intercepto: r3(ML.bias),
  };
}

// ── Modelos sobre a PNS 2019 (resultados exportados pelo Python) ────────────
{
  const P = ctx.window.PNS_RESULTS, cm = P.matriz_confusao;
  R.pns_modelos = {
    n_amostra: P.n_amostra, n_teste: P.n_teste, prevalencia_amostral_pct: P.prevalencia_amostral_pct,
    modelos: P.modelos, importancia_rf: P.importancia_rf, or_por_dp: P.coef_odds_por_dp, matriz_confusao: cm,
    sensibilidade: r3(cm.tp / (cm.tp + cm.fn)), especificidade: r3(cm.tn / (cm.tn + cm.fp)),
    precisao: r3(cm.tp / (cm.tp + cm.fp)), acuracia: r3((cm.tp + cm.tn) / (cm.tp + cm.tn + cm.fp + cm.fn)),
  };
}

// ── Saída ────────────────────────────────────────────────────────────────────
const fmtP = p => (p < 0.001 ? 'p < 0,001' : 'p = ' + p.toFixed(3));
const fmtR = c => `r = ${c.r} (IC 95%: ${c.ic95[0]} a ${c.ic95[1]}; ${fmtP(c.p)}; n = ${c.n})`;
const pima = R.H4_H5_pima;
console.log([
  'Reprodução dos resultados do TCC (dados versionados no repositório)',
  '',
  `H1  inclinação ${R.H1.inclinacao_pp_ano} p.p./ano (IC 95%: ${R.H1.ic95.join(' a ')}); R² = ${R.H1.r2}; ${fmtP(R.H1.p)}`,
  `H2  ${fmtR(R.H2.pearson)}`,
  `    sem tendência linear: ${fmtR(R.H2.sem_tendencia_linear)}`,
  `    primeiras diferenças: ${fmtR(R.H2.primeiras_diferencas)}`,
  `H3  ${fmtR(R.H3.pearson)}`,
  `    Spearman: ${fmtR(R.H3.spearman)}`,
  `H4  Pima: AUC ${pima.metricas.auc} no teste (n = ${pima.metricas.nTest}); PNS 2019: AUC ${R.pns_modelos.modelos['Regressão Logística'].auc_teste}`,
  `H5  maiores coeficientes: ${pima.coeficientes_padronizados.slice(0, 2).map(c => `${c.variavel} (${c.coef})`).join(', ')}`,
  '',
  `SARIMA (publicado): MAPE ${R.serie_mensal.sarima_publicado.backtest_2020.mape_pct}% em 2020; ingênuo sazonal: ${R.serie_mensal.ingenuo_sazonal_2020.mape_pct.toFixed(1)}%`,
  `Validação externa 2021: previsto ${R.serie_mensal.validacao_externa_2021.previsto_ic95[0]} × observado ${R.serie_mensal.validacao_externa_2021.observado} (erro ${R.serie_mensal.validacao_externa_2021.erro_pct}%)`,
].join('\n'));

if (process.argv[2]) {
  fs.writeFileSync(process.argv[2], JSON.stringify(R, null, 1));
  console.log(`\nResultados completos gravados em ${process.argv[2]}`);
}

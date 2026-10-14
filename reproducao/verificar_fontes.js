// ─────────────────────────────────────────────────────────────────────────────
// Conferência dos dados do painel contra as respostas originais das fontes
//
// Lê as tabelas devolvidas pelo TabNet (DATASUS) e as saídas da reanálise da
// PNS 2019 guardadas em reproducao/fontes/ e confere, bloco a bloco, os valores
// gravados em data.js, serie_mensal.js e pns_results.js. As taxas (por UF, por
// região e padronizadas por idade) são recalculadas a partir das contagens.
//
// Uso (na raiz do repositório):  node reproducao/verificar_fontes.js
// Termina com código 1 se algum valor divergir.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const RAIZ = path.resolve(__dirname, '..');
const FONTES = path.join(__dirname, 'fontes');
const ler = f => fs.readFileSync(path.join(RAIZ, f), 'utf8').replace(/^﻿/, '');
const ctx = { window: {} };
vm.createContext(ctx);
['data.js', 'serie_mensal.js', 'pns_results.js']
  .forEach(f => vm.runInContext(ler(f).replace(/^const (\w+)\s*=/gm, 'var $1 ='), ctx));
const D = ctx.DATA, SM = ctx.window.SERIE_MENSAL, PNS = ctx.window.PNS_RESULTS;

// ── Leitura das tabelas do TabNet (HTML em ISO-8859-1) ─────────────────────
const ACENTOS = { acute: '́', grave: '̀', circ: '̂', tilde: '̃', cedil: '̧', uml: '̈' };
const texto = s => s
  .replace(/&([A-Za-z])(acute|grave|circ|tilde|cedil|uml);/g, (_, l, a) => l + ACENTOS[a])
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').normalize('NFC').trim();
const numero = s => (s.trim() === '-' ? 0 : Number(s.trim().replace(/\./g, '').replace(',', '.')));

function tabnet(arquivo) {
  const html = fs.readFileSync(path.join(FONTES, 'tabnet', arquivo), 'latin1');
  const corpo = html.slice(html.search(/<TBODY/i), html.search(/<\/TABLE>/i));
  const linhas = {};
  for (const tr of corpo.split(/<TR[^>]*>/i).slice(1)) {
    const celulas = [...tr.matchAll(/<TD[^>]*>([^<\r\n]*)/gi)].map(m => texto(m[1]));
    if (celulas.length > 1) linhas[celulas[0]] = celulas.slice(1).map(numero);
  }
  // a consulta enviada fica registrada no comentário <TABELA> ao fim da página
  const consulta = Object.fromEntries((html.match(/<TABELA>([\s\S]*?)<\/TABELA>/i) || ['', ''])[1]
    .split(/\r?\n/).filter(l => l.includes('=')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
  return { linhas, consulta };
}
const valor = (t, rotulo) => {
  const k = Object.keys(t.linhas).find(r => { r = r.replace(/^@/, ''); return r === rotulo || r.endsWith(' ' + rotulo) || r.startsWith(rotulo + ' '); });
  if (!k) throw new Error(`Linha "${rotulo}" não encontrada`);
  return t.linhas[k];
};
const json = f => JSON.parse(fs.readFileSync(path.join(FONTES, f), 'utf8').replace(/^﻿/, ''));
const r1 = v => Math.round(v * 10) / 10;
const soma = a => a.reduce((s, v) => s + v, 0);

// ── Conferências ──────────────────────────────────────────────────────────
const resultados = [];
function confere(bloco, fonte, obtido, esperado, tolerancia = 0) {
  const a = [].concat(obtido), b = [].concat(esperado);
  const ok = a.length === b.length && a.every((v, i) =>
    typeof v === 'number' ? Math.abs(v - b[i]) <= tolerancia + 1e-9 : v === b[i]);
  resultados.push({ bloco, fonte, ok, obtido: a, esperado: b });
}

// SIM — série anual 2000–2025 (2026 parcial fica fora da série)
{
  const t = tabnet('anual_result.html');
  confere('mortalidade.obitos', 'tabnet/anual_result.html', D.mortalidade.anos.map(a => valor(t, String(a))[0]), D.mortalidade.obitos);
}
// SIM 2025 — faixa etária (agregada em 7 faixas; idade ignorada excluída)
{
  const t = tabnet('r25_faixa.html'), v = r => valor(t, r)[0];
  const faixas = [
    v('Menor 1 ano') + v('1 a 4 anos') + v('5 a 9 anos') + v('10 a 14 anos') + v('15 a 19 anos'),
    v('20 a 29 anos') + v('30 a 39 anos'), v('40 a 49 anos'), v('50 a 59 anos'),
    v('60 a 69 anos'), v('70 a 79 anos'), v('80 anos e mais'),
  ];
  confere('mortalidadeFaixaEtaria.obitos', 'tabnet/r25_faixa.html', faixas, D.mortalidadeFaixaEtaria.obitos);
}
// SIM 2025 — raça/cor (ignorado excluído)
{
  const t = tabnet('r25_raca.html');
  confere('mortalidadeRaca.obitos', 'tabnet/r25_raca.html', D.mortalidadeRaca.labels.map(l => valor(t, l)[0]), D.mortalidadeRaca.obitos);
}
// SIM 2025 — categoria CID-10 (% do total)
{
  const t = tabnet('r25_cid.html'), total = valor(t, 'TOTAL')[0];
  const pct = D.mortalidadeCID.labels.map(l => r1(valor(t, l.slice(0, 3))[0] / total * 100));
  confere('mortalidadeCID.valores (%)', 'tabnet/r25_cid.html', pct, D.mortalidadeCID.valores);
}
// SIM 2025 — comparação com outras causas (lista CID-BR-10)
{
  const t = tabnet('r25_causas.html');
  const codigos = ['. 068', '. 070', '. 074', '. 055', '. 076', '. 039'];
  confere('mortalidadeComparacao.obitos', 'tabnet/r25_causas.html', codigos.map(c => valor(t, c)[0]), D.mortalidadeComparacao.obitos);
}
// SIM 2025 por UF ÷ população (Censo 2022, em milhões, gravada em data.js) → taxa por 100 mil
const UF_NOME = { AC: 'Acre', AL: 'Alagoas', AM: 'Amazonas', AP: 'Amapá', BA: 'Bahia', CE: 'Ceará', DF: 'Distrito Federal',
  ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão', MG: 'Minas Gerais', MS: 'Mato Grosso do Sul', MT: 'Mato Grosso',
  PA: 'Pará', PB: 'Paraíba', PE: 'Pernambuco', PI: 'Piauí', PR: 'Paraná', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte',
  RO: 'Rondônia', RR: 'Roraima', RS: 'Rio Grande do Sul', SC: 'Santa Catarina', SE: 'Sergipe', SP: 'São Paulo', TO: 'Tocantins' };
const REGIAO_UF = { Norte: ['AC', 'AM', 'AP', 'PA', 'RO', 'RR', 'TO'], Nordeste: ['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'],
  'Centro-Oeste': ['DF', 'GO', 'MS', 'MT'], Sudeste: ['ES', 'MG', 'RJ', 'SP'], Sul: ['PR', 'RS', 'SC'] };
{
  const E = D.estadosPrevalencia, t = tabnet('r25_uf.html');
  const pop = uf => E.pop[E.estados.indexOf(uf)];
  confere('estadosPrevalencia.mort (taxa)', 'tabnet/r25_uf.html', E.estados.map(uf => r1(valor(t, UF_NOME[uf])[0] / pop(uf) / 10)), E.mort);
  const tr = tabnet('r25_reg.html');
  confere('mortalidadeRegiao.taxa', 'tabnet/r25_reg.html', D.mortalidadeRegiao.labels.map(r =>
    r1(valor(tr, 'Região ' + r)[0] / soma(REGIAO_UF[r].map(pop)) / 10)), D.mortalidadeRegiao.taxa);
}
// SIM 2025 por região × faixa ÷ população 2024 por região × faixa → taxa bruta e padronizada (método direto)
{
  const m = tabnet('r25_reg_idade.html'), p = tabnet('pop24_reg_idade.html');
  const faixas = v => [v[0] + v[1], ...v.slice(2, 12)];          // <1 + 1–4 = 0–4; até 80 e mais
  const padrao = valor(p, 'TOTAL').slice(0, 11), pesos = padrao.map(x => x / soma(padrao));
  const bruta = [], padronizada = [];
  for (const r of D.mortalidadePadronizada.labels) {
    const ob = valor(m, 'Região ' + r), po = valor(p, 'Região ' + r);
    bruta.push(r1(ob[ob.length - 1] / po[po.length - 1] * 1e5));
    const o = faixas(ob), q = po.slice(0, 11);
    padronizada.push(r1(soma(o.map((v, i) => v / q[i] * pesos[i])) * 1e5));
  }
  confere('mortalidadePadronizada.bruta', 'tabnet/r25_reg_idade.html + pop24_reg_idade.html', bruta, D.mortalidadePadronizada.bruta);
  confere('mortalidadePadronizada.padronizada', 'tabnet/r25_reg_idade.html + pop24_reg_idade.html', padronizada, D.mortalidadePadronizada.padronizada);
}
// SIM — série mensal 2015–2020 (entrada do SARIMA)
{
  const s = json('sim/serie_mensal_obitos.json');
  confere('serie_mensal.js obs_valores', 'sim/serie_mensal_obitos.json', s.valores, SM.obs_valores);
  // coerência entre extrações: a soma dos 12 meses deve reproduzir o total anual
  const anos = [2015, 2016, 2017, 2018, 2019, 2020];
  confere('série mensal × série anual (2015–2020)', 'sim/serie_mensal_obitos.json + tabnet/anual_result.html',
    anos.map((a, i) => soma(s.valores.slice(i * 12, i * 12 + 12))), anos.map(a => D.mortalidade.obitos[D.mortalidade.anos.indexOf(a)]));
}
// SIH/SUS — internações e valor total por ano de processamento
{
  const I = D.internacoes, t = tabnet('sih_result.html');
  confere('internacoes.custototal (R$ mi)', 'tabnet/sih_result.html', I.anos.map(a => r1(valor(t, String(a))[0] / 1e6)), I.custototal);
  const n = json('sih/sih_internacoes.json');
  confere('internacoes.total', 'sih/sih_internacoes.json (saída do baixar_sih.py)', n.valores, I.total);
  confere('internacoes.ytd2026', 'tabnet/r26jul_int.html + r26jul_val.html',
    [valor(tabnet('r26jul_int.html'), '2026')[0], r1(valor(tabnet('r26jul_val.html'), '2026')[0] / 1e6)],
    [I.ytd2026.internacoes, I.ytd2026.custoMi]);
}
// SIH/SUS 2025 — região, sexo × faixa etária e amputações de membros inferiores
{
  const t = tabnet('rg25.html');
  confere('internacoesRegiao.n', 'tabnet/rg25.html', D.internacoesRegiao.labels.map(r => valor(t, 'Região ' + r)[0]), D.internacoesRegiao.n);
  const sf = tabnet('sf25.html'), col = (r, j) => valor(sf, r)[j];      // colunas: Masc, Fem, Total
  const agrega = j => [
    ['Menor 1 ano', '1 a 4 anos', '5 a 9 anos', '10 a 14 anos', '15 a 19 anos'], ['20 a 29 anos', '30 a 39 anos'],
    ['40 a 49 anos'], ['50 a 59 anos'], ['60 a 69 anos'], ['70 a 79 anos'], ['80 anos e mais'],
  ].map(g => soma(g.map(r => col(r, j))));
  confere('internacoesSexoFaixa.masc', 'tabnet/sf25.html', agrega(0), D.internacoesSexoFaixa.masc);
  confere('internacoesSexoFaixa.fem', 'tabnet/sf25.html', agrega(1), D.internacoesSexoFaixa.fem);
  const a = tabnet('ampP.html');
  confere('amputacoesAnos.total', 'tabnet/ampP.html', D.amputacoesAnos.anos.map(y => valor(a, String(y))[0]), D.amputacoesAnos.total);
}
// PNS 2019 — saídas da reanálise dos microdados
{
  // execução de rodar_pns.py e rodar_pns_raca.py sobre os microdados reais, no Google Colab
  const colab = json('pns/verificacao_pns_colab.json');
  const ibge = colab.raca.especificacao_ibge, anterior = colab.raca.especificacao_painel, original = json('pns/pns_raca.json');
  confere('pnsRaca (prev, n, total)', 'pns/verificacao_pns_colab.json (definição do IBGE)',
    [...ibge.prev, ...ibge.n, ibge.total], [...D.pnsRaca.prev, ...D.pnsRaca.n, D.pnsRaca.total]);
  confere('rodar_pns_raca.py × saída original por raça/cor', 'pns/verificacao_pns_colab.json × pns/pns_raca.json',
    [...anterior.prev, ...anterior.n, anterior.total], [...original.prev, ...original.n, original.total]);
  const lr = 'Regressão Logística', rep = colab.pns_results_reproduzido;
  confere('pns_results.js — regressão logística reexecutada', 'pns/verificacao_pns_colab.json (rodar_pns.py nos microdados)',
    [rep.n_amostra, rep.n_teste, ...Object.values(rep.modelos[lr]), ...Object.values(rep.matriz_confusao), ...Object.values(rep.coef_odds_por_dp), ...rep.roc[lr]],
    [PNS.n_amostra, PNS.n_teste, ...Object.values(PNS.modelos[lr]), ...Object.values(PNS.matriz_confusao), ...Object.values(PNS.coef_odds_por_dp), ...PNS.roc[lr]]);
  const log = fs.readFileSync(path.join(FONTES, 'pns', 'pns_run.log'), 'latin1');
  const n = Number(log.match(/Conjunto final[^:]*:\s*(\d+)/)[1]), prev = Number(log.match(/DM:\s*([\d.]+)%/)[1]);
  const aucs = Object.keys(PNS.modelos).map(m => {
    const lin = log.split(/\r?\n/).find(l => l.startsWith(m));
    const [, cv, dp, te] = lin.match(/AUC_cv=([\d.]+)\+\/-([\d.]+)\s+AUC_teste=([\d.]+)/);
    return [Number(cv), Number(dp), Number(te)];
  }).flat();
  confere('pns_results.js (n, prevalência, AUCs)', 'pns/pns_run.log (execução do rodar_pns.py)',
    [n, prev, ...aucs], [PNS.n_amostra, PNS.prevalencia_amostral_pct,
      ...Object.values(PNS.modelos).map(m => [m.auc_cv_media, m.auc_cv_dp, m.auc_teste]).flat()]);
}

// ── Relatório ─────────────────────────────────────────────────────────────
const largura = Math.max(...resultados.map(r => r.bloco.length));
for (const r of resultados) {
  console.log(`${r.ok ? 'OK       ' : 'DIVERGE  '} ${r.bloco.padEnd(largura)}  ← ${r.fonte}`);
  if (!r.ok) console.log(`           obtido:   ${JSON.stringify(r.obtido)}\n           esperado: ${JSON.stringify(r.esperado)}`);
}
const falhas = resultados.filter(r => !r.ok).length;
console.log(`\n${resultados.length - falhas} de ${resultados.length} blocos conferem com as fontes.`);
process.exit(falhas ? 1 : 0);

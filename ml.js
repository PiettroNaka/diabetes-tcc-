// ============================================================
// ML.JS — Regressão Logística treinada DE VERDADE no navegador
// Dataset: Pima Indians Diabetes (NIDDK) — 768 pacientes reais.
// Pipeline: limpeza/imputação → padronização (z-score) → split
// estratificado 70/30 → gradiente descendente → avaliação real
// (matriz de confusão, ROC, AUC). Tudo reproduzível (seed fixa).
// ============================================================

const ML = {
  trained: false,
  featNames: ['Gravidezes','Glicose','Pressão','Espessura pele','Insulina','IMC','Pedigree','Idade'],
  imputeCols: [1,2,3,4,5], // colunas onde 0 = ausente (implausível)
  // preenchidos após train():
  weights: null, bias: 0, means: [], stds: [], imputeMedian: [],
  metrics: {}, confusion: {}, roc: [], threshold: 0.5,
};

// PRNG determinístico (mulberry32) — garante mesmo resultado a cada carga
function _rng(seed) {
  return function() {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function _shuffle(arr, rnd) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function _median(vals) {
  const s = vals.slice().sort((x, y) => x - y), m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function _sigmoid(z) { return 1 / (1 + Math.exp(-z)); }

ML.train = function (opts) {
  opts = opts || {};
  const lr = opts.lr || 0.1, epochs = opts.epochs || 4000, l2 = opts.l2 || 0.0;
  const rnd = _rng(42);
  const nFeat = 8;

  // 1) Split estratificado 70/30 (mantém proporção de classes)
  const pos = PIMA.filter(r => r[8] === 1);
  const neg = PIMA.filter(r => r[8] === 0);
  const posS = _shuffle(pos, rnd), negS = _shuffle(neg, rnd);
  const cut = arr => Math.floor(arr.length * 0.7);
  const train = posS.slice(0, cut(posS)).concat(negS.slice(0, cut(negS)));
  const test  = posS.slice(cut(posS)).concat(negS.slice(cut(negS)));
  const trainS = _shuffle(train, rnd);

  // 2) Imputação: mediana (treino) onde 0 = ausente
  const median = [];
  for (let j = 0; j < nFeat; j++) {
    if (ML.imputeCols.includes(j)) {
      const nz = trainS.filter(r => r[j] !== 0).map(r => r[j]);
      median[j] = _median(nz);
    } else median[j] = 0;
  }
  const impute = row => row.map((v, j) => (j < nFeat && ML.imputeCols.includes(j) && v === 0) ? median[j] : v);

  // 3) Padronização z-score (estatística do TREINO — evita leakage)
  const means = [], stds = [];
  for (let j = 0; j < nFeat; j++) {
    const col = trainS.map(r => impute(r)[j]);
    const mu = col.reduce((s, v) => s + v, 0) / col.length;
    const sd = Math.sqrt(col.reduce((s, v) => s + (v - mu) ** 2, 0) / col.length) || 1;
    means[j] = mu; stds[j] = sd;
  }
  const toX = row => { const im = impute(row); return im.slice(0, nFeat).map((v, j) => (v - means[j]) / stds[j]); };

  const Xtr = trainS.map(toX), ytr = trainS.map(r => r[8]);
  const Xte = test.map(toX),  yte = test.map(r => r[8]);

  // 4) Gradiente descendente (entropia cruzada)
  let w = new Array(nFeat).fill(0), b = 0;
  const m = Xtr.length;
  for (let ep = 0; ep < epochs; ep++) {
    const gw = new Array(nFeat).fill(0); let gb = 0;
    for (let i = 0; i < m; i++) {
      const p = _sigmoid(w.reduce((s, wj, j) => s + wj * Xtr[i][j], 0) + b);
      const err = p - ytr[i];
      for (let j = 0; j < nFeat; j++) gw[j] += err * Xtr[i][j];
      gb += err;
    }
    for (let j = 0; j < nFeat; j++) w[j] -= lr * (gw[j] / m + l2 * w[j]);
    b -= lr * (gb / m);
  }

  // 5) Avaliação no conjunto de TESTE
  const scores = Xte.map(x => _sigmoid(w.reduce((s, wj, j) => s + wj * x[j], 0) + b));
  let TP = 0, FN = 0, FP = 0, TN = 0;
  scores.forEach((p, i) => {
    const pred = p >= ML.threshold ? 1 : 0;
    if (yte[i] === 1 && pred === 1) TP++;
    else if (yte[i] === 1 && pred === 0) FN++;
    else if (yte[i] === 0 && pred === 1) FP++;
    else TN++;
  });
  const acc  = (TP + TN) / (TP + TN + FP + FN);
  const prec = TP / (TP + FP || 1);
  const rec  = TP / (TP + FN || 1);
  const spec = TN / (TN + FP || 1);
  const f1   = 2 * prec * rec / ((prec + rec) || 1);

  // 6) Curva ROC + AUC (varredura de limiares)
  const thr = [];
  for (let t = 0; t <= 1.0001; t += 0.02) thr.push(+t.toFixed(2));
  const roc = thr.map(t => {
    let tp = 0, fp = 0, fn = 0, tn = 0;
    scores.forEach((p, i) => {
      const pred = p >= t ? 1 : 0;
      if (yte[i] === 1 && pred === 1) tp++;
      else if (yte[i] === 1 && pred === 0) fn++;
      else if (yte[i] === 0 && pred === 1) fp++;
      else tn++;
    });
    return [fp / (fp + tn || 1), tp / (tp + fn || 1)]; // [FPR, TPR]
  }).sort((a, b) => a[0] - b[0]);
  // AUC trapezoidal
  let auc = 0;
  for (let i = 1; i < roc.length; i++) auc += (roc[i][0] - roc[i - 1][0]) * (roc[i][1] + roc[i - 1][1]) / 2;

  // 7) Persistir modelo
  ML.weights = w; ML.bias = b; ML.means = means; ML.stds = stds; ML.imputeMedian = median;
  ML.metrics = { acc, prec, rec, spec, f1, auc, nTrain: Xtr.length, nTest: Xte.length };
  ML.confusion = { TP, FN, FP, TN };
  ML.roc = roc;
  ML.trained = true;
  return ML;
};

// Probabilidade prevista a partir de valores BRUTOS (escala original)
// rawObj: { Gravidezes, Glicose, Pressao, EspessuraPele, Insulina, IMC, Pedigree, Idade }
ML.predictRaw = function (rawArr) {
  const im = rawArr.map((v, j) => (ML.imputeCols.includes(j) && v === 0) ? ML.imputeMedian[j] : v);
  const xs = im.map((v, j) => (v - ML.means[j]) / ML.stds[j]);
  const z = ML.weights.reduce((s, wj, j) => s + wj * xs[j], 0) + ML.bias;
  // contribuição (log-odds) de cada fator para explicabilidade
  const contrib = ML.weights.map((wj, j) => wj * xs[j]);
  return { prob: _sigmoid(z), logit: z, contrib };
};

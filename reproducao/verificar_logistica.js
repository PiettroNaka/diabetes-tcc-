// ─────────────────────────────────────────────────────────────────────────────
// Verificação da convergência da regressão logística do painel (Pima)
//
// Treina o modelo exatamente como no navegador (ml.js: gradiente descendente,
// η = 0,1, 4.000 épocas, semente 42) e compara os nove coeficientes com a
// solução exata de máxima verossimilhança, obtida pelo método de Newton-Raphson
// (mínimos quadrados reponderados iterativamente) sobre o MESMO conjunto de
// treino padronizado. Coincidência até a terceira casa decimal indica que o
// gradiente descendente atingiu o ótimo da função de perda.
//
// Uso (na raiz do repositório):  node reproducao/verificar_logistica.js
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const RAIZ = path.resolve(__dirname, '..');
const ler = f => fs.readFileSync(path.join(RAIZ, f), 'utf8').replace(/^﻿/, '');
const comoVar = src => src.replace(/^const (\w+)\s*=/gm, 'var $1 =');

// expõe a matriz de treino que ml.js monta internamente, sem alterar o cálculo
const ANCORA = 'ML.weights = w;';
const mlSrc = ler('ml.js');
if (!mlSrc.includes(ANCORA)) throw new Error(`Âncora "${ANCORA}" não encontrada em ml.js`);

const ctx = { window: {}, Math, Array, console };
vm.createContext(ctx);
vm.runInContext(comoVar(ler('pima.js')), ctx);
vm.runInContext(comoVar(mlSrc.replace(ANCORA, 'ML._Xtr = Xtr; ML._ytr = ytr; ' + ANCORA)), ctx);
const ML = ctx.ML;
ML.train();

// matriz de delineamento com intercepto na primeira coluna
const X = ML._Xtr.map(x => [1, ...x]), y = ML._ytr;
const k = X[0].length;
const sigmoide = z => 1 / (1 + Math.exp(-z));

function resolver(A, b) { // eliminação de Gauss com pivoteamento parcial
  const M = A.map((linha, i) => [...linha, b[i]]), n = b.length;
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let i = c + 1; i < n; i++) if (Math.abs(M[i][c]) > Math.abs(M[piv][c])) piv = i;
    [M[c], M[piv]] = [M[piv], M[c]];
    for (let i = c + 1; i < n; i++) {
      const f = M[i][c] / M[c][c];
      for (let j = c; j <= n; j++) M[i][j] -= f * M[c][j];
    }
  }
  const s = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let acc = M[i][n];
    for (let j = i + 1; j < n; j++) acc -= M[i][j] * s[j];
    s[i] = acc / M[i][i];
  }
  return s;
}

// Newton-Raphson: β ← β + (XᵀWX)⁻¹ Xᵀ(y − p), com W = diag(p(1 − p))
let beta = Array(k).fill(0), iter = 0;
for (; iter < 50; iter++) {
  const p = X.map(x => sigmoide(x.reduce((s, v, j) => s + v * beta[j], 0)));
  const H = Array.from({ length: k }, () => Array(k).fill(0));
  const g = Array(k).fill(0);
  X.forEach((x, i) => {
    const w = p[i] * (1 - p[i]);
    for (let a = 0; a < k; a++) {
      g[a] += x[a] * (y[i] - p[i]);
      for (let b = 0; b < k; b++) H[a][b] += x[a] * w * x[b];
    }
  });
  const passo = resolver(H, g);
  beta = beta.map((v, j) => v + passo[j]);
  if (Math.max(...passo.map(Math.abs)) < 1e-10) break;
}

const gd = [ML.bias, ...ML.weights];
const nomes = ['Intercepto', ...ML.featNames];
const dif = gd.map((v, j) => Math.abs(v - beta[j]));
console.log(`Treino: ${X.length} registros; Newton-Raphson convergiu em ${iter + 1} iterações\n`);
console.log('Variável           Gradiente desc.   Máx. verossimilhança   Diferença');
nomes.forEach((nm, j) => console.log(
  `${nm.padEnd(18)} ${gd[j].toFixed(4).padStart(15)}   ${beta[j].toFixed(4).padStart(20)}   ${dif[j].toFixed(4).padStart(9)}`));
const iguais3 = gd.every((v, j) => v.toFixed(3) === beta[j].toFixed(3));
console.log(`\nMaior diferença absoluta: ${Math.max(...dif).toExponential(1)}`);
console.log(`Coeficientes iguais até a 3ª casa decimal: ${iguais3 ? 'sim' : 'não'}`);

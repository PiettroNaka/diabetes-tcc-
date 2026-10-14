# -*- coding: utf-8 -*-
"""
Treina e compara 3 modelos (Logística x Random Forest x XGBoost) com validação
cruzada sobre os MICRODADOS REAIS da PNS 2019 (IBGE/Fiocruz) e gera os arquivos
consumidos pelo painel. Posições das colunas vêm do input SAS oficial.
"""
import json, pathlib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import make_pipeline
from sklearn.metrics import roc_auc_score, f1_score, roc_curve, confusion_matrix
from xgboost import XGBClassifier

AQUI = pathlib.Path(__file__).resolve().parent          # reproducao/
BASE = AQUI.parent                                       # raiz do repositório
DADOS = AQUI / "dados_brutos" / "PNS_2019.txt"

# (posição inicial no SAS, largura) -> colspec base-0 = (ini-1, ini-1+larg)
SPEC = {
    "C006":   (108, 1),   # sexo (1=Homem, 2=Mulher)
    "C008":   (117, 3),   # idade
    "Q00201": (807, 1),   # hipertensão (1=Sim)
    "Q03001": (849, 1),   # diabetes (1=Sim, 2=Não)
    "W00103": (1347, 5),  # peso aferido (kg, 1 decimal implícito)
    "W00203": (1362, 5),  # altura aferida (cm, 1 decimal implícito)
    "V00301": (1440, 17), # peso amostral p/ antropometria (calibrado)
}
names = list(SPEC.keys())
colspecs = [(ini - 1, ini - 1 + larg) for (ini, larg) in SPEC.values()]

print("Lendo microdados (434 MB)...")
df = pd.read_fwf(DADOS, colspecs=colspecs, names=names, dtype=str, encoding="latin-1")
print("Linhas lidas:", len(df))

# morador selecionado com diagnóstico de diabetes respondido
df = df[df["Q03001"].isin(["1", "2"])].copy()
print("Morador selecionado (módulo Q):", len(df))

d = pd.DataFrame()
d["idade"]       = pd.to_numeric(df["C008"], errors="coerce")
d["sexo_fem"]    = (pd.to_numeric(df["C006"], errors="coerce") == 2).astype(int)
d["hipertensao"] = (pd.to_numeric(df["Q00201"], errors="coerce") == 1).astype(int)
peso = pd.to_numeric(df["W00103"], errors="coerce")   # kg (valor já com decimal, ex.: "085.0")
alt  = pd.to_numeric(df["W00203"], errors="coerce")   # cm (ex.: "169.0")
d["imc"] = peso / (alt / 100.0) ** 2
d["dm"]  = (pd.to_numeric(df["Q03001"], errors="coerce") == 1).astype(int)

# limpeza: adultos, IMC plausível (subamostra de antropometria), sem ausentes
d = d[(d["idade"] >= 18) & d["imc"].between(12, 60)]
d = d.dropna(subset=["idade", "sexo_fem", "hipertensao", "imc", "dm"])
print("Conjunto final (subamostra com antropometria):", len(d))
print("Prevalência amostral de DM: %.1f%%" % (100 * d["dm"].mean()))

features = ["idade", "sexo_fem", "hipertensao", "imc"]
X, y = d[features], d["dm"]
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.3, stratify=y, random_state=42)

modelos = {
    "Regressão Logística": make_pipeline(StandardScaler(),
                                          LogisticRegression(max_iter=5000, class_weight="balanced")),
    "Random Forest":       RandomForestClassifier(n_estimators=300, max_depth=8,
                                                   class_weight="balanced", random_state=42, n_jobs=-1),
    "XGBoost":             XGBClassifier(n_estimators=400, max_depth=4, learning_rate=0.05,
                                         subsample=0.9, eval_metric="logloss", random_state=42, n_jobs=-1),
}
cv = StratifiedKFold(5, shuffle=True, random_state=42)
grid = np.linspace(0, 1, 41)          # grade de FPR p/ interpolar a ROC (curva enxuta p/ o painel)
resultados, roc_pts, probas = {}, {}, {}
for nome, mod in modelos.items():
    auc_cv = cross_val_score(mod, X, y, cv=cv, scoring="roc_auc", n_jobs=-1)
    mod.fit(Xtr, ytr)
    proba = mod.predict_proba(Xte)[:, 1]; probas[nome] = proba
    resultados[nome] = {
        "auc_cv_media": round(float(auc_cv.mean()), 3),
        "auc_cv_dp":    round(float(auc_cv.std()), 3),
        "auc_teste":    round(float(roc_auc_score(yte, proba)), 3),
        "f1_teste":     round(float(f1_score(yte, (proba >= 0.5).astype(int))), 3),
    }
    fpr, tpr, _ = roc_curve(yte, proba)
    roc_pts[nome] = [round(float(v), 3) for v in np.interp(grid, fpr, tpr)]  # TPR na grade de FPR
    print(f"{nome:22s} AUC_cv={resultados[nome]['auc_cv_media']:.3f}"
          f"+/-{resultados[nome]['auc_cv_dp']:.3f}  AUC_teste={resultados[nome]['auc_teste']:.3f}")

rf = modelos["Random Forest"]
imp = {f: round(float(v), 3) for f, v in zip(features, rf.feature_importances_)}

# ── Modelo principal (Regressão Logística) — matriz de confusão + coeficientes (OR) ──
log_pipe = modelos["Regressão Logística"]
log_proba = probas["Regressão Logística"]
cm = confusion_matrix(yte, (log_proba >= 0.5).astype(int))   # [[TN,FP],[FN,TP]]
tn, fp, fn, tp = [int(v) for v in cm.ravel()]
logreg = log_pipe.named_steps["logisticregression"]
coef_std = logreg.coef_[0]                                    # log-odds por 1 desvio-padrão
odds = {f: round(float(np.exp(c)), 2) for f, c in zip(features, coef_std)}  # razão de chances por +1 DP

saida = {
    "fonte": "PNS 2019 (IBGE/Fiocruz) — microdados reais (subamostra de antropometria)",
    "n_amostra": int(len(d)),
    "n_teste": int(len(yte)),
    "prevalencia_amostral_pct": round(100 * float(d["dm"].mean()), 1),
    "features": features,
    "modelos": resultados,
    "importancia_rf": imp,
    "roc_grid": [round(float(v), 3) for v in grid],
    "roc": roc_pts,
    "modelo_principal": "Regressão Logística",
    "matriz_confusao": {"tn": tn, "fp": fp, "fn": fn, "tp": tp},
    "coef_odds_por_dp": odds,   # razão de chances de DM por +1 desvio-padrão de cada preditor
}
(AQUI / "modelos_pns_resultados.json").write_text(
    json.dumps(saida, ensure_ascii=False, indent=2), encoding="utf-8")
(BASE / "pns_results.js").write_text(
    "window.PNS_RESULTS = " + json.dumps(saida, ensure_ascii=False) + ";", encoding="utf-8")
print("\nGerado: ../pns_results.js  e  modelos_pns_resultados.json")

# -*- coding: utf-8 -*-
"""
Ajusta SARIMA à série mensal REAL de óbitos por diabetes (DATASUS/SIM 2015-2020),
faz backtest out-of-sample e prevê 18 meses à frente com IC 95%. Exporta para o painel.
"""
import json, pathlib, warnings
import numpy as np, pandas as pd
import statsmodels.api as sm
warnings.filterwarnings("ignore")

src = json.load(open("dados_brutos/serie_mensal_obitos.json", encoding="utf-8"))
labels, y = src["labels"], np.array(src["valores"], dtype=float)
idx = pd.period_range(labels[0], periods=len(y), freq="M")
s = pd.Series(y, index=idx)
print("Série:", labels[0], "->", labels[-1], "| n =", len(s))

ORDER, SORDER = (1, 1, 1), (1, 1, 1, 12)

# --- backtest: treina até os últimos 12 meses, prevê e compara ---
tr, te = s.iloc[:-12], s.iloc[-12:]
bt = sm.tsa.SARIMAX(tr, order=ORDER, seasonal_order=SORDER,
                    enforce_stationarity=False, enforce_invertibility=False).fit(disp=False)
pred = bt.get_forecast(12).predicted_mean.values
mape = float(np.mean(np.abs((te.values - pred) / te.values)) * 100)
rmse = float(np.sqrt(np.mean((te.values - pred) ** 2)))
print(f"Backtest (12 meses): MAPE={mape:.1f}%  RMSE={rmse:.0f}")

# --- modelo final em toda a série + previsão 18 meses ---
res = sm.tsa.SARIMAX(s, order=ORDER, seasonal_order=SORDER,
                     enforce_stationarity=False, enforce_invertibility=False).fit(disp=False)
H = 18
fc = res.get_forecast(H)
mean = fc.predicted_mean
ci = fc.conf_int(alpha=0.05)
fut = pd.period_range(idx[-1] + 1, periods=H, freq="M")
print("AIC=%.0f  previsão %s -> %s" % (res.aic, str(fut[0]), str(fut[-1])))

out = {
    "fonte": "DATASUS/SIM - óbitos por diabetes (E10-E14), Brasil, por residência",
    "modelo": f"SARIMA{ORDER}x{SORDER}",
    "aic": round(float(res.aic), 1),
    "backtest": {"mape_pct": round(mape, 1), "rmse": round(rmse, 0)},
    "obs_labels": labels,
    "obs_valores": [int(v) for v in y],
    "fc_labels": [str(p) for p in fut],
    "fc_mean": [round(float(v), 1) for v in mean.values],
    "fc_lo":   [round(float(v), 1) for v in ci.iloc[:, 0].values],
    "fc_hi":   [round(float(v), 1) for v in ci.iloc[:, 1].values],
}
pathlib.Path("sarima_out.json").write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
# arquivo consumido pelo painel (window.SERIE_MENSAL)
pathlib.Path("..", "serie_mensal.js").write_text(
    "window.SERIE_MENSAL = " + json.dumps(out, ensure_ascii=False) + ";", encoding="utf-8")
print("Exportado: sarima_out.json  e  ../serie_mensal.js")
print("Previsão (3 primeiros meses):", list(zip(out["fc_labels"][:3], out["fc_mean"][:3])))

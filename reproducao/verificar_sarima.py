"""Reestima o modelo SARIMA a partir da série mensal versionada no repositório.

Lê a série de óbitos mensais por diabetes (SIM, jan/2015 a dez/2020) gravada em
serie_mensal.js, reajusta o SARIMA(1,1,1)(1,1,1)12 com o statsmodels e compara o
AIC, as previsões de 2021–2022 e a avaliação retrospectiva de 2020 com os
valores exportados para o painel e relatados no TCC.

O modelo publicado foi estimado sem impor estacionariedade e invertibilidade
(enforce_stationarity=False, enforce_invertibility=False): com essa
configuração, o AIC e as previsões são reproduzidos exatamente. A avaliação
retrospectiva (treino 2015–2019, teste 2020) é mais sensível ao otimizador e à
versão do statsmodels, e por isso é relatada também com a configuração padrão.

Uso (na raiz do repositório):
    pip install -r reproducao/requirements.txt
    python reproducao/verificar_sarima.py
"""
import json
import pathlib
import warnings

import numpy as np
import pandas as pd
from statsmodels.tsa.statespace.sarimax import SARIMAX

warnings.filterwarnings("ignore")  # avisos de convergência e de parâmetros iniciais

RAIZ = pathlib.Path(__file__).resolve().parent.parent
ORDEM, ORDEM_SAZONAL = (1, 1, 1), (1, 1, 1, 12)
CONFIG_PUBLICADA = dict(enforce_stationarity=False, enforce_invertibility=False)


def ler_serie_mensal():
    txt = (RAIZ / "serie_mensal.js").read_text(encoding="utf-8-sig")
    return json.loads(txt[txt.index("{"): txt.rindex("}") + 1])


def ajustar(y, **config):
    return SARIMAX(y, order=ORDEM, seasonal_order=ORDEM_SAZONAL, **config).fit(disp=False)


def metricas(obs, prev):
    obs, prev = np.asarray(obs, float), np.asarray(prev, float)
    mape = np.mean(np.abs((obs - prev) / obs)) * 100
    rmse = np.sqrt(np.mean((obs - prev) ** 2))
    return f"MAPE {mape:.1f}% e RMSE {rmse:.0f}"


def main():
    pub = ler_serie_mensal()
    y = pd.Series(pub["obs_valores"],
                  index=pd.period_range(pub["obs_labels"][0], periods=len(pub["obs_valores"]), freq="M"))
    h = len(pub["fc_labels"])
    print(f"Série: {pub['obs_labels'][0]} a {pub['obs_labels'][-1]} ({len(y)} meses) — {pub['fonte']}")
    print(f"Modelo publicado: {pub['modelo']}\n")

    # 1) ajuste sobre a série completa e previsão de 2021–2022
    modelo = ajustar(y, **CONFIG_PUBLICADA)
    prev = modelo.get_forecast(h)
    media, ic = prev.predicted_mean.values, prev.conf_int(alpha=0.05).values
    print(f"AIC: reestimado {modelo.aic:.1f} | publicado {pub['aic']}")
    dif = np.abs(media - np.array(pub["fc_mean"]))
    print(f"Previsão de {h} meses: maior diferença absoluta em relação à publicada = {dif.max():.1f} óbitos")
    print("  mês       reestimado (IC 95%)              publicado (IC 95%)")
    for i in (0, 11, h - 1):
        print(f"  {pub['fc_labels'][i]}   {media[i]:7.1f} ({ic[i, 0]:7.1f} a {ic[i, 1]:7.1f})"
              f"   {pub['fc_mean'][i]:7.1f} ({pub['fc_lo'][i]:7.1f} a {pub['fc_hi'][i]:7.1f})")
    i2021 = [i for i, l in enumerate(pub["fc_labels"]) if l.startswith("2021")]
    print(f"  total previsto para 2021: reestimado {media[i2021].sum():.0f} "
          f"| publicado {sum(pub['fc_mean'][i] for i in i2021):.0f}")

    # 2) avaliação retrospectiva: treino 2015–2019, teste 2020 (previsão de 12 passos)
    treino, teste = y[:-12], y[-12:]
    print(f"\nAvaliação retrospectiva 2020 (publicado: MAPE {pub['backtest']['mape_pct']}% "
          f"e RMSE {pub['backtest']['rmse']:.0f}):")
    print(f"  configuração publicada: {metricas(teste, ajustar(treino, **CONFIG_PUBLICADA).forecast(12))}")
    print(f"  configuração padrão:    {metricas(teste, ajustar(treino).forecast(12))}")

    # 3) referência ingênua sazonal (2020 previsto pelos mesmos meses de 2019)
    print(f"  ingênuo sazonal:        {metricas(teste, y[-24:-12])}")


if __name__ == "__main__":
    main()

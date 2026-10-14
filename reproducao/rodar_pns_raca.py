# -*- coding: utf-8 -*-
"""
Prevalência de diabetes autorreferido por cor ou raça nos microdados da PNS 2019.

RECONSTRUÇÃO: o código original deste recorte não foi preservado. Só a saída dele
foi guardada (fontes/pns/pns_raca.json). Este script refaz o cálculo a partir da
descrição do TCC e do painel: adultos (18+), peso do morador selecionado com
calibração (V00291), estimativa ponderada por cor ou raça. Executado sobre os
microdados (fontes/pns/verificacao_pns_colab.json), reproduz exatamente a saída
original na especificação "painel" e o total oficial (7,7%) na especificação
"ibge", que passou a ser a usada no bloco pnsRaca de data.js.

Calcula duas especificações:
  painel — denominador: quem respondeu à pergunta Q03001 (1 = Sim, 2 = Não),
           como no rodar_pns.py; numerador: Q03001 = 1.
  ibge   — denominador: todos os adultos com entrevista individual realizada
           (M001 = 1). Quem nunca mediu a glicemia não recebe a pergunta Q03001
           e conta como "sem diagnóstico"; o diabetes apenas na gravidez
           (Q03002 = 1) não entra no numerador. É a definição do indicador
           oficial do IBGE (7,7% em 2019).

Uso: coloque PNS_2019.txt em reproducao/dados_brutos/ e execute
    python reproducao/rodar_pns_raca.py
"""
import json
import pathlib

import pandas as pd

AQUI = pathlib.Path(__file__).resolve().parent
DADOS = AQUI / "dados_brutos" / "PNS_2019.txt"
ORIGINAL = AQUI / "fontes" / "pns" / "pns_raca.json"

# (posição inicial no input SAS oficial, largura)
SPEC = {
    "C008":   (117, 3),    # idade
    "C009":   (120, 1),    # cor ou raça: 1 Branca, 2 Preta, 3 Amarela, 4 Parda, 5 Indígena, 9 Ignorado
    "M001":   (527, 1),    # entrevista do adulto selecionado: 1 = realizada
    "Q03001": (849, 1),    # diagnóstico médico de diabetes: 1 Sim, 2 Não, 9 Ignorado
    "Q03002": (850, 1),    # diabetes apenas durante a gravidez: 1 Sim
    "V00291": (1426, 14),  # peso do morador selecionado com calibração
}
RACAS = {"1": "Branca", "2": "Preta", "3": "Amarela", "4": "Parda", "5": "Indígena"}


def ler_microdados():
    colspecs = [(ini - 1, ini - 1 + larg) for ini, larg in SPEC.values()]
    df = pd.read_fwf(DADOS, colspecs=colspecs, names=list(SPEC), dtype=str, encoding="latin-1")
    df["idade"] = pd.to_numeric(df["C008"], errors="coerce")
    df["peso"] = pd.to_numeric(df["V00291"], errors="coerce")
    return df


def prevalencias(base, positivo):
    """Prevalência ponderada (%) e tamanho da amostra, total e por cor ou raça."""
    def prev(b, p):
        return round(100 * float((b["peso"] * p[b.index]).sum() / b["peso"].sum()), 1)
    com_raca = base[base["C009"].isin(list(RACAS))]
    return {
        "labels": list(RACAS.values()),
        "prev": [prev(com_raca[com_raca["C009"] == c], positivo) for c in RACAS],
        "n": [int((com_raca["C009"] == c).sum()) for c in RACAS],
        "total": prev(base, positivo),
        "total_so_raca_informada": prev(com_raca, positivo),
        "n_total": int(len(base)),
    }


def main():
    df = ler_microdados()
    adultos = df[(df["idade"] >= 18) & df["peso"].notna()]

    painel = adultos[adultos["Q03001"].isin(["1", "2"])]
    res_painel = prevalencias(painel, painel["Q03001"].eq("1").astype(int))

    ibge = adultos[adultos["M001"].eq("1")]
    pos_ibge = (ibge["Q03001"].eq("1") & ~ibge["Q03002"].eq("1")).astype(int)
    res_ibge = prevalencias(ibge, pos_ibge)

    saida = {"fonte": "PNS 2019 (IBGE) — microdados; peso V00291; adultos de 18 anos ou mais",
             "especificacao_painel": res_painel, "especificacao_ibge": res_ibge}
    (AQUI / "pns_raca_reproduzida.json").write_text(json.dumps(saida, ensure_ascii=False, indent=2), encoding="utf-8")

    original = json.loads(ORIGINAL.read_text(encoding="utf-8-sig"))
    print("Especificação do painel (deve reproduzir fontes/pns/pns_raca.json):")
    for chave in ("prev", "n", "total"):
        igual = res_painel[chave] == original[chave]
        print(f"  {chave:6s} reproduzido={res_painel[chave]}  original={original[chave]}  {'IGUAL' if igual else 'DIFERENTE'}")
    print(f"\nEspecificação do IBGE (indicador oficial de 2019 = 7,7%): total = {res_ibge['total']}%"
          f"  | por cor ou raça: {dict(zip(res_ibge['labels'], res_ibge['prev']))}")
    print("\nGerado: reproducao/pns_raca_reproduzida.json")


if __name__ == "__main__":
    main()

# -*- coding: utf-8 -*-
"""
Baixa do TabNet/DATASUS a série MENSAL REAL de óbitos por diabetes (CID-10 E10-E14,
Grupo CID = 47), Brasil, 2015-2022, via POST. Sem microdado, sem dado sintético.
"""
import urllib.request, urllib.parse, ssl, re, json, pathlib

URL = "https://tabnet.datasus.gov.br/cgi/tabcgi.exe?sim/cnv/obt10br.def"
ANOS = range(2015, 2023)  # 2015..2022 (anos completos)

# variáveis de filtro (todas = TODAS, exceto o Grupo CID-10 = 47 = Diabetes mellitus)
SVARS = [
    "SMunicípio","SCapital","SRegião_de_Saúde_(CIR)","SMacrorregião_de_Saúde","SMicrorregião_IBGE",
    "SRegião_Metropolitana_-_RIDE","STerritório_da_Cidadania","SMesorregião_PNDR","SAmazônia_Legal",
    "SSemiárido","SFaixa_de_Fronteira","SZona_de_Fronteira","SMunicípio_de_extrema_pobreza",
    "SCapítulo_CID-10","SCategoria_CID-10","SCausa_-_CID-BR-10","SCausa_mal_definidas",
    "SFaixa_Etária","SFaixa_Etária_OPS","SFaixa_Etária_det","SFx.Etária_Menor_1A",
    "SSexo","SCor/raça","SEscolaridade","SEstado_civil","SLocal_ocorrência",
]

def enc(s):  # percent-encode em latin-1 (TabNet usa latin-1)
    return urllib.parse.quote(s, safe="", encoding="latin-1")

pairs = [
    ("Linha", "Ano/mês_do_Óbito"),
    ("Coluna", "--Não-Ativa--"),
    ("Incremento", "Óbitos_p/Residênc"),
]
for a in ANOS:
    pairs.append(("Arquivos", f"obtbr{a % 100:02d}.dbf"))
pairs.append(("SGrupo_CID-10", "47"))          # Diabetes mellitus (E10-E14)
for v in SVARS:
    pairs.append((v, "TODAS_AS_CATEGORIAS__"))
pairs += [("formato", "table"), ("mostre", "Mostra")]

import sys
MODO = sys.argv[1] if len(sys.argv) > 1 else "build"

if MODO == "build":
    body = "&".join(f"{enc(n)}={enc(str(v))}" for n, v in pairs)
    pathlib.Path("dados_brutos/post_body.txt").write_text(body, encoding="ascii")
    print("Corpo do POST escrito (", len(body), "bytes ). Rode o curl.")
    sys.exit(0)

# MODO == "parse"
html = pathlib.Path("dados_brutos/tabnet_result.html").read_text(encoding="latin-1")
print("Resposta:", len(html), "bytes")

# --- parse da tabela (células <TD> sem fechamento; rótulos "..Mês/AAAA") ---
import html as _html
cells = [_html.unescape(c) for c in re.findall(r'<td[^>]*>\s*([^<\r\n]+?)\s*(?=<|\r|\n)', html, re.I)]
MESES = {"Janeiro":1,"Fevereiro":2,"Março":3,"Abril":4,"Maio":5,"Junho":6,
         "Julho":7,"Agosto":8,"Setembro":9,"Outubro":10,"Novembro":11,"Dezembro":12}
serie = []
for i in range(len(cells) - 1):
    m = re.match(r'\.\.([A-Za-zçÇ]+)/(\d{4})', cells[i])
    if m and m.group(1) in MESES:
        val = cells[i + 1].replace(".", "").strip()
        if val.isdigit():
            serie.append((int(m.group(2)), MESES[m.group(1)], int(val)))
serie.sort()
# mantém apenas a maior sequência contígua a partir do início (evita lacunas, ex.: 2021 ausente)
contig = []
for item in serie:
    if not contig:
        contig.append(item); continue
    py, pm = contig[-1][0], contig[-1][1]
    prox = (py + 1, 1) if pm == 12 else (py, pm + 1)
    if (item[0], item[1]) == prox:
        contig.append(item)
    else:
        break
serie = contig
print("Meses capturados:", len(serie))
print("Primeiros:", serie[:3], "...", "Ultimos:", serie[-3:] if serie else None)

if serie:
    out = {
        "fonte": "DATASUS/SIM (TabNet) - óbitos por diabetes (CID-10 E10-E14), Brasil, por residência",
        "inicio": {"ano": serie[0][0], "mes": serie[0][1]},
        "labels": [f"{a:04d}-{m:02d}" for a, m, _ in serie],
        "valores": [v for _, _, v in serie],
    }
    pathlib.Path("dados_brutos/serie_mensal_obitos.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print("Salvo: dados_brutos/serie_mensal_obitos.json")
    print("Total de óbitos no período:", sum(out["valores"]))

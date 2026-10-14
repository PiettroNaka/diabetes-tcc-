# -*- coding: utf-8 -*-
"""Óbitos ANUAIS por diabetes (CID-10 E10-E14, Grupo=47), Brasil, do TabNet/SIM.
Modo 'build' escreve o corpo do POST; modo 'parse' lê o resultado do curl."""
import urllib.parse, re, json, sys, pathlib

ANOS = range(2000, 2027)  # 2000..2026 (verifica 2025/2026 recém-publicados; avaliar se completos)
SVARS = [
    "SMunicípio","SCapital","SRegião_de_Saúde_(CIR)","SMacrorregião_de_Saúde","SMicrorregião_IBGE",
    "SRegião_Metropolitana_-_RIDE","STerritório_da_Cidadania","SMesorregião_PNDR","SAmazônia_Legal",
    "SSemiárido","SFaixa_de_Fronteira","SZona_de_Fronteira","SMunicípio_de_extrema_pobreza",
    "SCapítulo_CID-10","SCategoria_CID-10","SCausa_-_CID-BR-10","SCausa_mal_definidas",
    "SFaixa_Etária","SFaixa_Etária_OPS","SFaixa_Etária_det","SFx.Etária_Menor_1A",
    "SSexo","SCor/raça","SEscolaridade","SEstado_civil","SLocal_ocorrência",
]
enc = lambda s: urllib.parse.quote(s, safe="", encoding="latin-1")

if (sys.argv[1] if len(sys.argv) > 1 else "build") == "build":
    pairs = [("Linha", "Ano_do_Óbito"), ("Coluna", "--Não-Ativa--"), ("Incremento", "Óbitos_p/Residênc")]
    pairs += [("Arquivos", f"obtbr{a % 100:02d}.dbf") for a in ANOS]
    pairs.append(("SGrupo_CID-10", "47"))
    pairs += [(v, "TODAS_AS_CATEGORIAS__") for v in SVARS]
    pairs += [("formato", "table"), ("mostre", "Mostra")]
    body = "&".join(f"{enc(n)}={enc(str(v))}" for n, v in pairs)
    pathlib.Path("dados_brutos/post_anual.txt").write_text(body, encoding="ascii")
    print("body anual escrito")
    sys.exit(0)

html = pathlib.Path("dados_brutos/anual_result.html").read_text(encoding="latin-1")
cells = re.findall(r'<td[^>]*>\s*([^<\r\n]+?)\s*(?=<|\r|\n)', html, re.I)
serie = []
for i in range(len(cells) - 1):
    m = re.fullmatch(r'(\d{4})', cells[i].strip())
    val = cells[i + 1].replace(".", "").strip()
    if m and val.isdigit():
        serie.append((int(m.group(1)), int(val)))
serie.sort()
print("anos:", len(serie), "|", serie[:2], "...", serie[-3:])
out = {"anos": [a for a, _ in serie], "obitos": [v for _, v in serie],
       "fonte": "DATASUS/SIM (TabNet) — óbitos por diabetes E10-E14, Brasil, residência"}
pathlib.Path("dados_brutos/obitos_anuais.json").write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
print("salvo obitos_anuais.json")

# -*- coding: utf-8 -*-
"""Óbitos por diabetes (Grupo CID=47) do SIM/TabNet, quebrados por uma dimensão.
Uso: build <LINHA> <ANO> | parse <chave>. LINHA ex.: 'Região' , 'Faixa_Etária'."""
import urllib.parse, re, json, sys, pathlib, os

enc = lambda s: urllib.parse.quote(s, safe="", encoding="latin-1")
LINHAS = {"regiao": "Região", "idade": "Faixa_Etária"}

SVARS = ["SMunicípio","SCapital","SRegião_de_Saúde_(CIR)","SMacrorregião_de_Saúde","SMicrorregião_IBGE",
    "SRegião_Metropolitana_-_RIDE","STerritório_da_Cidadania","SMesorregião_PNDR","SAmazônia_Legal",
    "SSemiárido","SFaixa_de_Fronteira","SZona_de_Fronteira","SMunicípio_de_extrema_pobreza",
    "SCapítulo_CID-10","SCategoria_CID-10","SCausa_-_CID-BR-10","SCausa_mal_definidas",
    "SFaixa_Etária","SFaixa_Etária_OPS","SFaixa_Etária_det","SFx.Etária_Menor_1A",
    "SSexo","SCor/raça","SEscolaridade","SEstado_civil","SLocal_ocorrência"]

modo = sys.argv[1] if len(sys.argv) > 1 else "build"
if modo == "build":
    chave = sys.argv[2]; ano = int(sys.argv[3])
    linha = LINHAS[chave]
    # remove do S* a variável que virou Linha (senão TabNet reclama)
    svars = [v for v in SVARS if v.lstrip("S").replace("_", " ").lower() != linha.replace("_", " ").lower()]
    pairs = [("Linha", linha), ("Coluna", "--Não-Ativa--"), ("Incremento", "Óbitos_p/Residênc"),
             ("Arquivos", f"obtbr{ano % 100:02d}.dbf"), ("SGrupo_CID-10", "47")]
    pairs += [(v, "TODAS_AS_CATEGORIAS__") for v in svars]
    pairs += [("formato", "table"), ("mostre", "Mostra")]
    body = "&".join(f"{enc(n)}={enc(str(v))}" for n, v in pairs)
    pathlib.Path("dados_brutos/post_dim.txt").write_text(body, encoding="ascii")
    print(f"body {chave} {ano} escrito")
    sys.exit(0)

# parse
chave = sys.argv[2]
html = pathlib.Path("dados_brutos/dim_result.html").read_text(encoding="latin-1")
import html as H
cells = [H.unescape(c).strip() for c in re.findall(r'<td[^>]*>\s*([^<\r\n]+?)\s*(?=<|\r|\n)', html, re.I)]
pares = []
for i in range(len(cells) - 1):
    rot = cells[i]
    val = cells[i + 1].replace(".", "")
    # rótulo textual (região/faixa) seguido de número
    if val.isdigit() and re.search(r'[A-Za-zÀ-ÿ]', rot) and rot.upper() != "TOTAL" and len(rot) < 40:
        pares.append((rot, int(val)))
print(f"{chave}: {len(pares)} categorias")
for r, v in pares: print(f"  {r}: {v}")
pathlib.Path(f"dados_brutos/sim_{chave}.json").write_text(
    json.dumps({"cat": [r for r, _ in pares], "obitos": [v for _, v in pares],
                "fonte": "DATASUS/SIM (TabNet) — óbitos diabetes E10-E14, Brasil, residência"},
               ensure_ascii=False, indent=2), encoding="utf-8")
print(f"salvo sim_{chave}.json")

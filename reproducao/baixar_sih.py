# -*- coding: utf-8 -*-
"""Internações (ou custo) por diabetes (SLista_Morb__CID-10=124), SIH/SUS via TabNet
usando niuf.def (por local de internação; agregado nacional por ano de atendimento).
Uso: build [Internações|Valor_total] | parse [internacoes|valor]"""
import urllib.parse, re, json, sys, pathlib, html as H

enc = lambda s: urllib.parse.quote(s, safe="", encoding="latin-1")
SVARS = ["SRegião","SUnidade_da_Federação","SCaráter_atendimento","SRegime",
         "SCapítulo_CID-10","SFaixa_Etária_1","SFaixa_Etária_2","SSexo","SCor/raça"]

if (sys.argv[1] if len(sys.argv) > 1 else "build") == "build":
    incremento = sys.argv[2] if len(sys.argv) > 2 else "Internações"
    arquivos = [f"niuf{a % 100:02d}{m:02d}.dbf" for a in range(2010, 2026) for m in range(1, 13)]
    pairs = [("Linha", "Ano_processamento"), ("Coluna", "--Não-Ativa--"), ("Incremento", incremento)]
    pairs += [("Arquivos", f) for f in arquivos]
    pairs.append(("SLista_Morb__CID-10", "124"))          # Diabetes mellitus
    pairs += [(v, "TODAS_AS_CATEGORIAS__") for v in SVARS]
    pairs += [("formato", "table"), ("mostre", "Mostra")]
    pathlib.Path("dados_brutos/post_sih.txt").write_text(
        "&".join(f"{enc(n)}={enc(str(v))}" for n, v in pairs), encoding="ascii")
    print(f"body SIH ({incremento}) escrito — {len(arquivos)} arquivos")
    sys.exit(0)

chave = sys.argv[2] if len(sys.argv) > 2 else "internacoes"
is_valor = (chave == "valor")
h = pathlib.Path("dados_brutos/sih_result.html").read_text(encoding="latin-1")
cells = [H.unescape(c).strip() for c in re.findall(r'<td[^>]*>\s*([^<\r\n]+?)\s*(?=<|\r|\n)', h, re.I)]
serie = []
for i in range(len(cells) - 1):
    if re.fullmatch(r'\d{4}', cells[i]):
        raw = cells[i + 1]
        if is_valor:
            try: num = float(raw.replace(".", "").replace(",", "."))
            except ValueError: continue
        else:
            v = raw.replace(".", "")
            if not v.isdigit(): continue
            num = int(v)
        serie.append((int(cells[i]), num))
serie.sort()
print(f"{chave}: {len(serie)} anos ->", serie[:2], "...", serie[-3:])
if serie:
    pathlib.Path(f"dados_brutos/sih_{chave}.json").write_text(
        json.dumps({"anos": [a for a, _ in serie], "valores": [v for _, v in serie]},
                   ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"salvo sih_{chave}.json")

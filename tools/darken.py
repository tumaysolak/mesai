import re, sys

SRC = "src/styles.css"
OUT = "src/panel-dark.css"

SKIP_PREFIX = (".lp-", ".legal-", ".gate-", ".lp", ".legal", ".gate")

HEX = re.compile(r"#[0-9a-fA-F]{3,8}\b")

def parse_hex(h):
    h = h[1:]
    if len(h) in (3, 4):
        h = "".join(c * 2 for c in h[:3])
    if len(h) == 8:
        h = h[:6]
    if len(h) != 6:
        return None
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def light(rgb):
    return (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255

def chroma(rgb):
    return (max(rgb) - min(rgb)) / 255

def lighten(rgb, target=0.72):
    l = light(rgb) or 0.01
    k = target / l
    return tuple(min(255, round(c * k)) for c in rgb)

def keeps_light_bg(body):
    """True when a block holds on to a bright accent fill, so its text must
    stay dark to remain readable."""
    for raw in body.split(";"):
        prop, _, value = raw.partition(":")
        prop = prop.strip()
        if not prop.startswith("background"):
            continue
        if "var(--lime)" in value:
            return True
        for h in HEX.findall(value):
            rgb = parse_hex(h)
            if rgb and light(rgb) > 0.62 and chroma(rgb) >= 0.18:
                return True
    return False


def remap(prop, value, keep_dark_text=False):
    """Return a dark-theme value, or None when nothing needs changing."""
    hexes = HEX.findall(value)
    if not hexes:
        return None
    out = value
    changed = False
    for h in set(hexes):
        rgb = parse_hex(h)
        if rgb is None:
            continue
        l, c = light(rgb), chroma(rgb)
        new = None
        if prop == "outline" or prop == "outline-color":
            return None
        if prop.startswith("border"):
            new = ("rgba(239,236,227,.12)" if c < 0.25
                   else "rgba(%d,%d,%d,.45)" % rgb)
        elif prop.startswith("background"):
            if l > 0.62:
                new = ("rgba(255,255,255,.045)" if c < 0.18
                       else "rgba(%d,%d,%d,.16)" % rgb)
            elif l > 0.30 and c < 0.12:
                new = "rgba(255,255,255,.07)"
        elif prop in ("color", "fill", "stroke", "caret-color",
                      "-webkit-text-fill-color", "text-decoration-color"):
            if keep_dark_text:
                continue
            if c < 0.18:
                if l < 0.5:
                    new = "#efece3"
                elif l < 0.68:
                    new = "#94928a"
            elif l < 0.55:
                new = "#%02x%02x%02x" % lighten(rgb)
        elif prop == "box-shadow":
            if l > 0.62:
                new = "rgba(255,255,255,.06)"
        if new and new != h:
            out = out.replace(h, new)
            changed = True
    return out if changed else None

def scope(selector):
    parts = [p.strip() for p in selector.split(",")]
    kept = []
    for p in parts:
        if not p or p.startswith("@") or p.startswith("from") or p.startswith("to"):
            return None
        head = p.split()[0].split(":")[0]
        if any(head.startswith(x) for x in SKIP_PREFIX):
            continue
        if p.startswith(".app-shell"):
            kept.append(p)
        elif p.startswith(":root") or p in ("html", "body", "*"):
            continue
        else:
            kept.append(".app-shell " + p)
    return ", ".join(kept) if kept else None

def blocks(css):
    """Yield (selector, body) pairs, descending into @media only."""
    i, n = 0, len(css)
    while i < n:
        brace = css.find("{", i)
        if brace < 0:
            break
        sel = css[i:brace].strip()
        depth, j = 1, brace + 1
        while j < n and depth:
            if css[j] == "{":
                depth += 1
            elif css[j] == "}":
                depth -= 1
            j += 1
        body = css[brace + 1 : j - 1]
        if sel.startswith("@media"):
            yield ("@media", sel, body)
        elif sel.startswith("@"):
            pass
        else:
            yield ("rule", sel, body)
        i = j

def convert(css, indent=""):
    out = []
    for kind, sel, body in blocks(css):
        if kind == "@media":
            inner = convert(body, indent + "  ")
            if inner.strip():
                out.append(f"{indent}{sel} {{\n{inner}{indent}}}\n")
            continue
        scoped = scope(sel)
        if not scoped:
            continue
        decls = []
        keep_dark = keeps_light_bg(body)
        for raw in body.split(";"):
            if ":" not in raw:
                continue
            prop, _, value = raw.partition(":")
            prop, value = prop.strip(), value.strip()
            if not prop or prop.startswith("--"):
                continue
            new = remap(prop, value, keep_dark)
            if new:
                decls.append(f"{indent}  {prop}: {new};")
        if decls:
            out.append(f"{indent}{scoped} {{\n" + "\n".join(decls) + f"\n{indent}}}\n")
    return "\n".join(out)

css = open(SRC, encoding="utf-8").read()
result = convert(css)
header = ("/* Generated from styles.css: the same panel, read on a dark floor.\n"
          "   Regenerate with tools/darken.py after editing styles.css. */\n\n")
open(OUT, "w", encoding="utf-8").write(header + result)
print("rules:", result.count("{"))

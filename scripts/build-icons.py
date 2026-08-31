#!/usr/bin/env python3
"""Derives every logo and launcher icon from the one source artwork.

    python3 scripts/build-icons.py

Run it again after replacing ../logo.png; everything under public/ that this
writes is generated, and hand-editing any of it will be silently undone.

WHY A SCRIPT RATHER THAN A FOLDER OF EXPORTS

Nine icons cut by hand drift. One gets re-exported at a slightly different crop,
another keeps the old glow, and the set stops looking like one mark — which
matters most at the sizes where the difference is least visible and the icon is
doing the most work. The crops below are measured from the artwork's own alpha
channel, so they stay correct if the source is re-rendered at another size.

THE SOURCE

logo.png is 1536x1024 with a genuinely transparent background — not black, which
is what it looks like. That is lucky and load-bearing: a glow-on-black JPEG would
have had to sit in a black box on a white masthead, and here the mark can be
composited onto whatever ground each context needs.

Three things stack in it, measured rather than assumed:

    tree      x 377-1110, y 20-580     the circuit-board canopy and its trunk
    wordmark  y 585-830                "Indic-ai"
    tagline   y 915-987                "Foundation for social good" — not used;
                                       see the note on LOCKUP
"""

import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.dirname(HERE)
SOURCE = os.path.join(os.path.dirname(WEB), 'logo.png')
OUT = os.path.join(WEB, 'public')

# Measured from the alpha channel; see the module docstring.
TREE = (377, 20, 1110, 580)

# The lockup stops above the tagline, deliberately.
#
# "Foundation for social good" is set in the artwork at #d3d3d3, which is about
# 1.6:1 against the light theme's white surface — invisible, not subtle. It is
# also English baked into a raster, on a site that ships in Hindi as well and
# resizes text to 200%. So those words are set as real text beside the mark
# instead: readable in both themes, translatable, selectable, and scaling with
# whatever font size the reader has already chosen on their device.
LOCKUP = (232, 8, 1303, 895)

# The ground every launcher icon sits on.
#
# The mark is a glow, and a glow needs something to glow against: dropped onto
# the white that iOS composites a transparent icon over, the soft outer falloff
# disappears and the tree loses the halo that is most of its shape. This is the
# same family as the app's own dark surface rather than pure black, so the icon
# does not read as a hole punched in a dark home screen.
GROUND = (11, 14, 20, 255)


def load():
    im = Image.open(SOURCE).convert('RGBA')
    if im.size != (1536, 1024):
        raise SystemExit(
            f'source is {im.size}, expected (1536, 1024) — the crops in this '
            f'file are measured in source pixels and would be wrong')
    return im


def square(mark, side, occupancy, ground=GROUND):
    """Centres a mark on a square ground, scaled to fill `occupancy` of it.

    Occupancy is of the longest edge, so a wide mark and a tall one end up
    optically the same weight rather than mathematically the same area.
    """
    canvas = Image.new('RGBA', (side, side), ground)

    target = int(side * occupancy)
    scale = target / max(mark.size)
    resized = mark.resize(
        (max(1, round(mark.width * scale)), max(1, round(mark.height * scale))),
        Image.LANCZOS)

    canvas.alpha_composite(
        resized,
        ((side - resized.width) // 2, (side - resized.height) // 2))
    return canvas


def transparent(mark, width, colours=None):
    """The mark alone, scaled to a width, background left transparent.

    `colours` quantises to an adaptive palette. The mark is a smooth gradient,
    which is the worst case for that — but at 128 colours the banding is below
    the noise floor of a 9rem image, and it takes a third off a file that every
    visitor downloads on a connection they may be paying for by the megabyte.
    """
    scale = width / mark.width
    out = mark.resize((width, max(1, round(mark.height * scale))), Image.LANCZOS)
    if colours:
        out = out.quantize(colors=colours, method=Image.FASTOCTREE,
                           dither=Image.Dither.NONE).convert('RGBA')
    return out


def main():
    im = load()
    tree = im.crop(TREE)
    lockup = im.crop(LOCKUP)

    written = []

    def save(img, name, **kw):
        path = os.path.join(OUT, name)
        img.save(path, **kw)
        written.append((name, os.path.getsize(path)))

    # --- the mark in the page ------------------------------------------------
    #
    # Transparent, because in the masthead and the footer it sits on the app's
    # own surface — which is white in one theme and near-black in the other, and
    # the glow works on both.
    # Sized at roughly twice their display width — 2.25rem for the mark and
    # 9rem for the lockup — which covers a 2x screen without paying for a 4x
    # one nobody has. Both are quantised; see `transparent`.
    save(transparent(tree, 96, colours=128), 'logo-mark.png', optimize=True)
    save(transparent(lockup, 320, colours=128), 'logo-full.png', optimize=True)

    # --- launcher icons ------------------------------------------------------
    #
    # 0.82 of the tile. Tight enough that the tree is still legible at 32px,
    # loose enough that the glow is not cropped into a hard edge.
    for side in (16, 32, 180, 192, 512):
        name = {180: 'apple-touch-icon.png'}.get(side, f'icon-{side}.png')
        icon = square(tree, side, 0.82)
        # Quantised above 64px only: at 16 and 32 the palette is already tiny
        # and quantising costs more in banding than it saves in bytes.
        if side > 64:
            icon = icon.quantize(colors=128, method=Image.FASTOCTREE,
                                 dither=Image.Dither.NONE).convert('RGBA')
        save(icon, name, optimize=True)

    # Maskable: Android may crop this to a circle, and everything outside the
    # centre 80% of the diameter is at its mercy. The mark is therefore smaller
    # and the ground runs to the edge — the alternative is a tree with its
    # canopy sliced flat on four launchers out of five.
    save(square(tree, 512, 0.56).quantize(
        colors=128, method=Image.FASTOCTREE, dither=Image.Dither.NONE
    ).convert('RGBA'), 'icon-maskable-512.png', optimize=True)

    # --- favicon.ico ---------------------------------------------------------
    #
    # Still worth shipping beside the SVG: a browser that ignores the SVG link
    # falls back to /favicon.ico by convention whether or not it is declared.
    ico = square(tree, 64, 0.82)
    ico.save(os.path.join(OUT, 'favicon.ico'),
             sizes=[(16, 16), (32, 32), (48, 48)])
    written.append(('favicon.ico', os.path.getsize(os.path.join(OUT, 'favicon.ico'))))

    total = sum(size for _, size in written)
    for name, size in written:
        print(f'  {name:28} {size / 1024:6.1f} kB')
    print(f'  {"":28} {total / 1024:6.1f} kB total')


if __name__ == '__main__':
    main()

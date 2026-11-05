"""Optional end-to-end test: opens dist/couveuse.html in Chromium, exports the rest loop and an action as GIF,
and checks the action's first/last frames equal the rest's (the chaining promise, through the real encoder).

    pip install playwright pillow numpy && python -m playwright install chromium
    npm run build && python tests/browser_export.py
"""
import asyncio, pathlib, numpy as np
from PIL import Image, ImageSequence
from playwright.async_api import async_playwright

PAGE = (pathlib.Path(__file__).parent.parent / "dist" / "couveuse.html").resolve().as_uri()
OUT = pathlib.Path(__file__).parent / "out"; OUT.mkdir(exist_ok=True)

async def export_gif(pg, name):
    async with pg.expect_download(timeout=240000) as d:
        await pg.click("#exGif")
    path = OUT / name
    await (await d.value).save_as(path)
    return [np.array(f.convert("RGB")) for f in ImageSequence.Iterator(Image.open(path))]

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={"width": 1300, "height": 900}, accept_downloads=True)
        errors = []; pg.on("pageerror", lambda e: errors.append(str(e)))
        await pg.goto(PAGE); await pg.wait_for_timeout(1000)
        await pg.click('summary:has-text("Rendu")')
        await pg.eval_on_selector("#in-gifScale", "e=>{e.value=1;e.dispatchEvent(new Event('input'))}")
        rest = await export_gif(pg, "rest.gif")
        await pg.click(".tab[data-anim=actions]"); await pg.click("button.act:has-text('Saut')"); await pg.wait_for_timeout(300)
        act = await export_gif(pg, "jump.gif")
        d = lambda a, b: int(np.abs(a.astype(int) - b).max())
        print("frames", len(rest), len(act), "first", d(act[0], rest[0]), "last", d(act[-1], rest[-1]), "errors", errors)
        assert d(act[0], rest[0]) == 0 and d(act[-1], rest[-1]) == 0 and not errors
        await b.close()

asyncio.run(main())

# python3 tools/mensen/cartoon.py — getekende portretten van de vier Cocks uit hun foto's (ref/gezicht/), voor het menu,
# en dezelfde stijl als functie voor de gezichten op de hoofden (mens.py). OpenCV: randbehoudend gladstrijken, kleuren
# samenvoegen tot vlakken, en donkere lijnen langs de trekken.
import cv2, numpy as np, json, sys, os

def cartoon(bgr, sterk=1.0):
    h, w = bgr.shape[:2]; s = 512 / max(h, w); im = cv2.resize(bgr, (int(w * s), int(h * s)), interpolation=cv2.INTER_AREA)
    glad = im
    for _ in range(int(2 + 3 * sterk)): glad = cv2.bilateralFilter(glad, 9, 40, 7)
    # kleuren samenvoegen (k-means op een paar tinten), daarna zacht zodat de vlakken niet hoekig worden
    Z = glad.reshape(-1, 3).astype(np.float32); K = 14
    _, lab, cen = cv2.kmeans(Z, K, None, (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 12, 1.0), 2, cv2.KMEANS_PP_CENTERS)
    vlak = cen[lab.flatten()].reshape(glad.shape).astype(np.uint8); vlak = cv2.addWeighted(vlak, 0.65 * sterk, glad, 1 - 0.65 * sterk, 0)
    # lijnen: verschil van twee vervagingen (XDoG), alleen de duidelijke trekken
    g = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255
    d = cv2.GaussianBlur(g, (0, 0), 1.2) - 0.985 * cv2.GaussianBlur(g, (0, 0), 2.2)
    lijn = np.clip((-d - 0.004) * 55, 0, 1) * sterk; lijn = cv2.GaussianBlur(lijn, (0, 0), 0.7)
    uit = vlak.astype(np.float32) * (1 - 0.8 * lijn[..., None])
    # iets voller van kleur en helderder
    hsv = cv2.cvtColor(np.clip(uit, 0, 255).astype(np.uint8), cv2.COLOR_BGR2HSV).astype(np.float32); hsv[..., 1] *= 1.12; hsv[..., 2] = np.clip(hsv[..., 2] * 1.06 + 6, 0, 255)
    uit = cv2.cvtColor(np.clip(hsv, 0, 255).astype(np.uint8), cv2.COLOR_HSV2BGR)
    return cv2.resize(uit, (w, h), interpolation=cv2.INTER_CUBIC) if sterk < 0.99 or True else uit

if __name__ == "__main__":
    os.chdir(os.path.join(os.path.dirname(__file__), "../.."))
    M = {m["naam"]: m for m in json.load(open("tools/mensen/mensen.json"))["mensen"]}
    RAND = {"paul": (90, 150, 216), "dave": (240, 240, 235), "bob": (60, 60, 70), "wim": (40, 40, 40)}
    for n, m in M.items():
        g = m.get("gezicht"); if_ = g and g["foto"]
        if not g: continue
        foto = cv2.imread(g["foto"]); (lx, ly), (rx, ry) = g["ogen"]; mx, my = g["mond"]; io = np.hypot(rx - lx, ry - ly)
        # het gezicht rechtzetten (ogen horizontaal) en uitsnijden: van boven het hoofd tot onder de kin
        hoek = np.degrees(np.arctan2(ry - ly, rx - lx)); cx, cy = (lx + rx) / 2, (ly + ry) / 2 + (my - (ly + ry) / 2) * 0.3
        R = cv2.getRotationMatrix2D((cx, cy), hoek, 1.0); recht = cv2.warpAffine(foto, R, (foto.shape[1], foto.shape[0]), borderMode=cv2.BORDER_REPLICATE)
        half = int(io * 1.75); x0, y0 = int(cx - half), int(cy - half * 1.12); stuk = recht[max(0, y0):y0 + 2 * half, max(0, x0):x0 + 2 * half]
        stuk = cv2.copyMakeBorder(stuk, max(0, -y0), max(0, 2 * half - stuk.shape[0] - max(0, -y0)), max(0, -x0), max(0, 2 * half - stuk.shape[1] - max(0, -x0)), cv2.BORDER_REPLICATE)
        c = cv2.resize(cartoon(stuk), (512, 512))
        # rond, met een rand in de kleur van het karakter
        yy, xx = np.mgrid[:512, :512]; r = np.hypot(xx - 256, yy - 256); a = np.clip(250 - r, 0, 1); ring = (r > 238) & (r < 252)
        c[ring] = RAND[n][::-1]; out = np.dstack([c, (a * 255).astype(np.uint8)])
        cv2.imwrite(f"assets/portret/{n}.png", out); print("portret", n)
        # voor het hoofd: de hele foto in dezelfde stijl (iets zachter), op ware grootte
        cv2.imwrite(g["foto"].rsplit(".", 1)[0] + "_cartoon.png", cartoon(foto, 0.8))

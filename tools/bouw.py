# Bouwt data/lot.json: de Lot bij Le Temple-sur-Lot (water, oevers, huizen, wegen, bos en heggen).
#   python3 tools/bouw.py [map met ruwe bestanden]
# Bron: IGN BD TOPO (licence ouverte Etalab 2.0), opgehaald met:
#   https://data.geopf.fr/wfs/ows?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=BDTOPO_V3:<laag>
#     &BBOX=0.494,44.3765,0.522,44.3905,EPSG:4326&OUTPUTFORMAT=application/json&COUNT=3000
#   lagen: batiment, surface_hydrographique, troncon_de_route, zone_de_vegetation
# Assen in het spel: x = oost, z = zuid (meters); de oorsprong is het huis aan de oever.
import json, math, sys
RUW = sys.argv[1] if len(sys.argv) > 1 else '/tmp/lot/ruw'
LAT0, LON0 = 44.3835, 0.5085
kx = 111320 * math.cos(math.radians(LAT0)); ky = 110950
OX, OY = 160.0, -176.0   # het huis (meters ten opzichte van LAT0/LON0)
VER = 520
def L(c): return [round((c[0] - LON0) * kx - OX, 2), round(-((c[1] - LAT0) * ky - OY), 2)]
def laad(n): return json.load(open(f'{RUW}/{n}.json'))['features']
def dichtbij(r): return any(math.hypot(p[0], p[1]) < VER for p in r)
uit = {'naam': 'Le Temple-sur-Lot', 'water': [], 'huizen': [], 'wegen': [], 'bos': [], 'heg': []}
for f in laad('surface_hydrographique'):
    for mp in f['geometry']['coordinates']:
        r = [L(c) for c in mp[0]]
        if dichtbij(r): uit['water'].append({'r': r, 'gaten': [[L(c) for c in g] for g in mp[1:]]})
for f in laad('batiment'):
    p = f['properties']
    for mp in f['geometry']['coordinates']:
        r = [L(c) for c in mp[0]]
        if dichtbij(r): uit['huizen'].append({'r': r, 'h': p.get('hauteur') or 4, 'licht': bool(p.get('construction_legere')), 'soort': p.get('nature')})
for f in laad('troncon_de_route'):
    r = [L(c) for c in f['geometry']['coordinates']]
    if dichtbij(r): uit['wegen'].append({'p': r, 'pad': not f['properties']['nature'].startswith('Route à')})
for f in laad('zone_de_vegetation'):
    for mp in f['geometry']['coordinates']:
        r = [L(c) for c in mp[0]]
        if dichtbij(r): uit['heg' if f['properties']['nature'] == 'Haie' else 'bos'].append(r)
json.dump(uit, open('data/lot.json', 'w'), separators=(',', ':'))
print({k: len(v) for k, v in uit.items() if isinstance(v, list)})
print('huizen bij de oorsprong:', [(h['r'][0], h['h']) for h in uit['huizen'] if math.hypot(*h['r'][0]) < 90])

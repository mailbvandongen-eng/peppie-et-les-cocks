#!/bin/bash
# Bouwt alle mensen en de bewegingen, en maakt ze klein met meshopt.  tools/mensen/bouw.sh [naam...]
set -e
cd "$(dirname "$0")/../.."
UIT=assets/mensen; TMP=/tmp/lot/mens; mkdir -p $UIT $TMP
GT=/root/tools/homo-assets/node_modules/.bin/gltf-transform
namen=${@:-$(python3 -c "import json;print(' '.join(m['naam'] for m in json.load(open('tools/mensen/mensen.json'))['mensen']))")}
for n in $namen; do
  [ "$n" = bewegingen ] && continue
  cfg=$(python3 -c "import json,sys;print(json.dumps([m for m in json.load(open('tools/mensen/mensen.json'))['mensen'] if m['naam']==sys.argv[1]][0]))" "$n")
  blender -b --python-use-system-env -P tools/mensen/mens.py -- $TMP/$n.glb "$cfg" 2>&1 | grep -E "driehoeken|maat|Error|rror" || true
  $GT meshopt $TMP/$n.glb $UIT/$n.glb --level medium >/dev/null
done
if false; then
  blender -b --python-use-system-env -P tools/mensen/bewegingen.py -- $TMP/bewegingen.glb 2>&1 | grep -E "acties|rror" || true
  $GT resample $TMP/bewegingen.glb $TMP/bew2.glb >/dev/null && $GT meshopt $TMP/bew2.glb $UIT/bewegingen.glb >/dev/null
fi
ls -la $UIT

(function () {
    'use strict';

    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    const mobile = matchMedia('(max-width: 760px)');
    const coarse = matchMedia('(pointer: coarse)');
    const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
    const lerp = (a, b, t) => a + (b - a) * t;
    const smooth = t => t * t * (3 - 2 * t);
    const TAU = Math.PI * 2, PI = Math.PI, RAD = Math.PI / 180;
    function rng(seed) { return () => { let t = seed += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296 } }

    function progressFor(section) {
        if (!section) return 0;
        const r = section.getBoundingClientRect();
        const travel = Math.max(1, section.offsetHeight - innerHeight);
        return clamp(-r.top / travel);
    }
    function stageFor(p, edges) { for (let i = 0; i < edges.length - 1; i++)if (p < edges[i + 1] || i === edges.length - 2) return i; return edges.length - 2 }
    function localFor(p, edges, s) { return clamp((p - edges[s]) / (edges[s + 1] - edges[s] || 1)) }
    function activateChapters(section, selector, railSelector, stage) {
        section?.querySelectorAll(selector).forEach((el, i) => el.classList.toggle('active', i === stage));
        section?.querySelectorAll(railSelector).forEach((el, i) => el.classList.toggle('active', i === stage));
        if (section) section.dataset.stage = String(stage);
    }
    function bindRail(section, edges) {
        section?.querySelectorAll('[data-stage-jump]').forEach((button, i) => button.addEventListener('click', () => {
            const travel = Math.max(1, section.offsetHeight - innerHeight), mid = (edges[i] + edges[i + 1]) / 2;
            scrollTo({ top: section.offsetTop + travel * mid, behavior: reduce.matches ? 'auto' : 'smooth' });
        }));
    }

    /* -----------------------------------------------------------
       MOVING SPACE BACKGROUND
       One lightweight particle field. Scroll velocity controls depth
       speed and streak length; no comets, radars, or extra overlays.
    ------------------------------------------------------------ */
    const spaceCanvas = document.getElementById('spaceJourneyCanvas');
    const spaceCtx = spaceCanvas?.getContext('2d', { alpha: false });
    const spaceRandom = rng(0xC7A912);
    let SW = 1, SH = 1, SDPR = 1, spaceStars = [];
    let lastScrollY = scrollY || 0, lastScrollT = performance.now();
    let scrollSpeedTarget = 0, scrollSpeed = 0;

    function resetSpaceStar(star, near = false) {
        star.x = (spaceRandom() - .5) * 2.1;
        star.y = (spaceRandom() - .5) * 2.1;
        star.z = near ? .08 : (.08 + spaceRandom() * .92);
        star.size = .35 + spaceRandom() * 1.55;
        star.alpha = .18 + spaceRandom() * .72;
        star.tint = spaceRandom();
    }
    function buildSpace() {
        const count = mobile.matches ? 115 : 285;
        spaceStars = Array.from({ length: count }, () => { const s = {}; resetSpaceStar(s); return s });
    }
    function resizeSpace() {
        if (!spaceCanvas || !spaceCtx) return;
        SW = Math.max(1, innerWidth); SH = Math.max(1, innerHeight);
        SDPR = Math.min(devicePixelRatio || 1, mobile.matches ? 1 : 1.25);
        spaceCanvas.width = Math.round(SW * SDPR); spaceCanvas.height = Math.round(SH * SDPR);
        spaceCanvas.style.width = SW + 'px'; spaceCanvas.style.height = SH + 'px';
        spaceCtx.setTransform(SDPR, 0, 0, SDPR, 0, 0); buildSpace();
    }
    function projectSpace(star, z = star.z) {
        const inv = 1 / Math.max(.025, z);
        return { x: SW * .5 + star.x * SW * .47 * inv, y: SH * .5 + star.y * SH * .45 * inv };
    }
    function drawSpace(dt) {
        if (!spaceCtx) return;
        scrollSpeedTarget *= Math.pow(.90, dt / 16.67);
        scrollSpeed = lerp(scrollSpeed, scrollSpeedTarget, clamp(dt * .012));
        const advance = (reduce.matches ? 0 : (.000015 + scrollSpeed * .00078)) * dt;
        spaceCtx.fillStyle = '#000106'; spaceCtx.fillRect(0, 0, SW, SH);
        const haze = spaceCtx.createRadialGradient(SW * .52, SH * .46, 0, SW * .52, SH * .46, Math.max(SW, SH) * .74);
        haze.addColorStop(0, 'rgba(21,38,72,.052)'); haze.addColorStop(.42, 'rgba(9,15,31,.025)'); haze.addColorStop(1, 'rgba(0,0,0,0)');
        spaceCtx.fillStyle = haze; spaceCtx.fillRect(0, 0, SW, SH);
        for (const star of spaceStars) {
            const oldZ = Math.min(1, star.z + advance * (8 + scrollSpeed * 22));
            star.z -= advance;
            if (star.z < .025) { resetSpaceStar(star); star.z = .98; }
            const p = projectSpace(star), tail = projectSpace(star, oldZ);
            if (p.x < -80 || p.x > SW + 80 || p.y < -80 || p.y > SH + 80) { resetSpaceStar(star); continue; }
            const near = 1 - star.z, streak = clamp(scrollSpeed * 1.35, 0, 1.7);
            const blue = star.tint > .80 ? '184,220,255' : star.tint < .08 ? '255,224,232' : '230,239,255';
            if (streak > .04) {
                const grad = spaceCtx.createLinearGradient(tail.x, tail.y, p.x, p.y);
                grad.addColorStop(0, `rgba(${blue},0)`); grad.addColorStop(1, `rgba(${blue},${star.alpha * (.35 + near * .58)})`);
                spaceCtx.strokeStyle = grad; spaceCtx.lineWidth = Math.max(.45, star.size * (.6 + near * .75));
                spaceCtx.beginPath(); spaceCtx.moveTo(tail.x, tail.y); spaceCtx.lineTo(p.x, p.y); spaceCtx.stroke();
            }
            const r = star.size * (.52 + near * 1.15);
            spaceCtx.fillStyle = `rgba(${blue},${star.alpha * (.38 + near * .58)})`;
            spaceCtx.beginPath(); spaceCtx.arc(p.x, p.y, r, 0, TAU); spaceCtx.fill();
        }
    }

    /* -----------------------------------------------------------
       ORIGINAL-STYLE BLUE CYBERSECURITY GLOBE
       Projection, land fill, grid, arc packets, zoom path, and mesh
       are derived from the supplied initial globe. Decorative nuclear
       icons, flags, reticles, scanlines, and tactical clutter are omitted.
    ------------------------------------------------------------ */
    const earthSection = document.getElementById('signal-map');
    const earthCanvas = document.getElementById('signalCanvas');
    const earthCtx = earthCanvas?.getContext('2d', { alpha: false });
    const earthEdges = [0, .18, .38, .60, .82, 1];
    let EW = 1, EH = 1, EDPR = 1, earthP = 0, earthTargetP = 0, earthStage = 0, earthLocal = 0, earthVisible = false, earthFrame = 0;
    const cam = { lon: -24, lat: 6, zoom: .24, x: .68, y: .50, activity: .04, mesh: 0, dissolve: 0 };
    const cams = [
        { p: 0, lon: -24, lat: 6, zoom: .24, x: .68, y: .50, activity: .04, mesh: 0, dissolve: 0 },
        { p: .10, lon: -16, lat: 8, zoom: .74, x: .68, y: .50, activity: .20, mesh: 0, dissolve: 0 },
        { p: .28, lon: 6, lat: 10, zoom: 1.0, x: .68, y: .50, activity: .48, mesh: 0, dissolve: 0 },
        { p: .43, lon: 76, lat: 24, zoom: 2.18, x: .70, y: .50, activity: 1, mesh: 0, dissolve: 0 },
        { p: .515, lon: 176, lat: 26, zoom: 1.10, x: .68, y: .50, activity: 1, mesh: 0, dissolve: 0 },
        { p: .59, lon: 127, lat: 38, zoom: 2.22, x: .70, y: .50, activity: 1, mesh: 0, dissolve: 0 },
        { p: .74, lon: 14, lat: 14, zoom: 1.02, x: .68, y: .50, activity: .76, mesh: 1, dissolve: 0 },
        { p: .90, lon: -8, lat: 6, zoom: 1.14, x: .68, y: .51, activity: .36, mesh: 1, dissolve: .05 },
        { p: 1, lon: -24, lat: 2, zoom: 1.90, x: .68, y: .52, activity: .08, mesh: .18, dissolve: 1 }
    ];
    const fallbackShapes = [
        [[-168, 72], [-160, 70], [-150, 67], [-142, 62], [-137, 58], [-132, 55], [-128, 49], [-125, 45], [-124, 40], [-123, 36], [-121, 33], [-118, 31], [-116, 29], [-114, 28], [-111, 29], [-108, 31], [-105, 31], [-101, 29], [-97, 25], [-95, 20], [-91, 18], [-87, 19], [-84, 24], [-82, 28], [-81, 31], [-79, 34], [-78, 37], [-75, 41], [-70, 45], [-66, 48], [-61, 52], [-60, 55], [-63, 58], [-68, 61], [-75, 63], [-84, 65], [-92, 68], [-102, 71], [-114, 73], [-127, 73], [-139, 73], [-150, 75], [-160, 75]],
        [[-73, 59], [-66, 60], [-58, 62], [-50, 66], [-44, 71], [-40, 76], [-42, 81], [-48, 83], [-56, 82], [-63, 79], [-68, 74], [-72, 68]],
        [[-81, 12], [-77, 10], [-73, 8], [-69, 9], [-64, 7], [-58, 4], [-54, -1], [-50, -7], [-47, -12], [-44, -18], [-42, -24], [-44, -31], [-48, -38], [-53, -45], [-58, -51], [-63, -55], [-68, -54], [-72, -48], [-74, -41], [-75, -34], [-77, -27], [-78, -20], [-80, -12], [-81, -3]],
        [[-10, 36], [-6, 38], [-2, 42], [3, 44], [8, 46], [13, 45], [18, 47], [22, 51], [27, 55], [33, 58], [40, 58], [44, 55], [40, 50], [34, 47], [29, 45], [24, 42], [20, 40], [15, 38], [9, 37], [4, 37], [-1, 38], [-6, 37]],
        [[-17, 36], [-11, 35], [-5, 35], [2, 34], [9, 33], [15, 31], [21, 29], [26, 24], [31, 18], [34, 10], [37, 3], [39, -5], [37, -14], [33, -22], [28, -29], [22, -33], [15, -35], [8, -35], [2, -31], [-2, -24], [-5, -16], [-7, -7], [-9, 1], [-12, 9], [-15, 18], [-16, 26]],
        [[26, 34], [31, 37], [36, 41], [42, 45], [48, 50], [56, 54], [64, 57], [72, 60], [80, 63], [88, 66], [97, 68], [108, 69], [118, 67], [128, 64], [138, 58], [147, 53], [153, 47], [158, 42], [160, 36], [156, 31], [149, 27], [143, 23], [137, 19], [130, 15], [124, 12], [118, 10], [112, 8], [105, 9], [98, 12], [92, 16], [86, 22], [80, 26], [74, 29], [67, 31], [60, 31], [53, 30], [47, 29], [41, 30], [35, 32]],
        [[112, -11], [118, -12], [124, -13], [131, -16], [138, -20], [145, -24], [151, -28], [152, -34], [147, -39], [139, -41], [131, -40], [124, -36], [118, -31], [114, -24], [112, -18]],
        [[-180, -72], [-160, -70], [-140, -71], [-120, -74], [-95, -75], [-70, -74], [-45, -73], [-20, -72], [5, -71], [28, -72], [52, -73], [80, -74], [110, -73], [136, -72], [160, -71], [180, -72], [180, -84], [-180, -84]]
    ];
    let worldRings = fallbackShapes.map(r => ({ ring: r, centroid: { lon: r.reduce((a, p) => a + p[0], 0) / r.length, lat: r.reduce((a, p) => a + p[1], 0) / r.length } }));
    async function loadWorld() {
        try {
            if (!window.topojson) return;
            const res = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json', { mode: 'cors' });
            if (!res.ok) throw new Error('world map unavailable');
            const data = await res.json(), features = topojson.feature(data, data.objects.countries).features, rings = [];
            features.forEach(feat => { const g = feat.geometry; if (!g) return; const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates; polys.forEach(poly => poly.forEach(ring => { if (ring.length < 4) return; rings.push({ ring, centroid: { lon: ring.reduce((a, p) => a + p[0], 0) / ring.length, lat: ring.reduce((a, p) => a + p[1], 0) / ring.length } }) })) });
            if (rings.length > 30) worldRings = rings;
        } catch (_) {/* deterministic fallback already active */ }
    }
    loadWorld();

    const nodeList = [
        ['DEL', 28.61, 77.21, 'south'], ['BOM', 19.08, 72.88, 'south'], ['BLR', 12.97, 77.59, 'south'], ['ISB', 33.69, 73.06, 'south'], ['LHE', 31.55, 74.34, 'south'], ['KHI', 24.86, 67.01, 'south'],
        ['BJS', 39.90, 116.40, 'pacific'], ['SHA', 31.23, 121.47, 'pacific'], ['SZX', 22.54, 114.06, 'pacific'], ['HKG', 22.32, 114.17, 'pacific'], ['SFO', 37.77, -122.42, 'pacific'], ['LAX', 34.05, -118.24, 'pacific'], ['SEA', 47.61, -122.33, 'pacific'], ['NYC', 40.71, -74, 'pacific'], ['WAS', 38.91, -77.04, 'pacific'],
        ['SEL', 37.57, 126.98, 'korea'], ['PYO', 39.04, 125.76, 'korea'], ['PUS', 35.18, 129.08, 'korea'],
        ['TEH', 35.69, 51.39, 'mideast'], ['TLV', 32.08, 34.78, 'mideast'],
        ['DEN', 39.739, -104.99, 'global'], ['LON', 51.51, -.13, 'global'], ['FRA', 50.11, 8.68, 'global'], ['DXB', 25.2, 55.27, 'global'], ['SIN', 1.35, 103.82, 'global'], ['TYO', 35.68, 139.69, 'global'], ['MOS', 55.75, 37.62, 'minor']
    ].map(([id, lat, lon, group]) => ({ id, lat, lon, group }));
    const nodes = Object.fromEntries(nodeList.map(n => [n.id, n]));
    const earthRandom = rng(0xC7B3A19);
    const earthStars = Array.from({ length: mobile.matches ? 125 : 220 }, () => ({ x: earthRandom() * 2 - 1, y: earthRandom() * 2 - 1, z: earthRandom(), s: .35 + earthRandom() * 1.5 }));
    const hotspotGroups = {
        south: [{ lat: 28, lon: 75, radius: .46, intensity: 1 }, { lat: 31, lon: 72, radius: .38, intensity: .92 }],
        pacific: [{ lat: 35, lon: 113, radius: .58, intensity: 1 }, { lat: 39, lon: -104, radius: .78, intensity: .82 }],
        korea: [{ lat: 38.2, lon: 127, radius: .28, intensity: 1 }],
        mideast: [{ lat: 34, lon: 44, radius: .34, intensity: .42 }],
        mesh: [{ lat: 28, lon: 75, radius: .46, intensity: .72 }, { lat: 35, lon: 113, radius: .58, intensity: .72 }, { lat: 39, lon: -104, radius: .78, intensity: .64 }, { lat: 38.2, lon: 127, radius: .28, intensity: .70 }, { lat: 34, lon: 44, radius: .34, intensity: .30 }]
    };
    const scatter = [];
    Object.entries(hotspotGroups).forEach(([group, spots]) => spots.forEach(spot => { const density = group === 'mesh' ? 10 : (group === 'mideast' ? 8 : 18); for (let i = 0; i < density; i++)scatter.push({ group, lat: spot.lat + (earthRandom() - .5) * 6.4, lon: spot.lon + (earthRandom() - .5) * 6.4, phase: earthRandom() * TAU, size: .45 + earthRandom() * 1.25 }) }));
    const routes = [];
    function addRoute(group, a, b, count, lift, color = 'red') {
        for (let i = 0; i < count; i++)routes.push({ group, a, b, phase: earthRandom(), speed: .022 + earthRandom() * .044, lift: lift + i * .011, j: (i - (count - 1) / 2) * .30, color });
    }
    addRoute('south', 'DEL', 'ISB', 7, .12); addRoute('south', 'DEL', 'LHE', 5, .11); addRoute('south', 'BOM', 'KHI', 5, .13); addRoute('south', 'BLR', 'ISB', 3, .15); addRoute('south', 'KHI', 'DEL', 4, .12);
    addRoute('pacific', 'BJS', 'SFO', 6, .24); addRoute('pacific', 'SHA', 'LAX', 5, .23); addRoute('pacific', 'SZX', 'SEA', 4, .22); addRoute('pacific', 'HKG', 'NYC', 3, .25); addRoute('pacific', 'BJS', 'WAS', 3, .25);
    addRoute('korea', 'PYO', 'SEL', 8, .09); addRoute('korea', 'PYO', 'PUS', 5, .10); addRoute('korea', 'SEL', 'PYO', 5, .09);
    addRoute('mideast', 'TEH', 'TLV', 3, .12); addRoute('mideast', 'TEH', 'DXB', 2, .10);
    addRoute('global', 'LON', 'NYC', 2, .10, 'blue'); addRoute('global', 'TYO', 'SFO', 2, .13, 'blue'); addRoute('global', 'DEL', 'SIN', 2, .09, 'blue'); addRoute('global', 'SEL', 'TYO', 2, .07, 'blue');
    addRoute('defense', 'DEN', 'SFO', 2, .07, 'blue'); addRoute('defense', 'SFO', 'TYO', 3, .13, 'blue'); addRoute('defense', 'NYC', 'LON', 3, .10, 'blue'); addRoute('defense', 'LON', 'FRA', 2, .07, 'blue'); addRoute('defense', 'DEL', 'SIN', 3, .09, 'blue'); addRoute('defense', 'ISB', 'DXB', 2, .08, 'blue'); addRoute('defense', 'BJS', 'SIN', 2, .09, 'blue'); addRoute('defense', 'SEL', 'TYO', 3, .07, 'blue');

    function resizeEarth() {
        if (!earthCanvas || !earthCtx) return;
        const r = earthCanvas.getBoundingClientRect(); EW = Math.max(1, Math.round(r.width)); EH = Math.max(1, Math.round(r.height));
        EDPR = Math.min(devicePixelRatio || 1, mobile.matches ? 1 : 1.45);
        earthCanvas.width = Math.round(EW * EDPR); earthCanvas.height = Math.round(EH * EDPR); earthCtx.setTransform(EDPR, 0, 0, EDPR, 0, 0);
    }
    function vec(lat, lon, r = 1) { const a = lat * RAD, o = lon * RAD, c = Math.cos(a); return { x: c * Math.sin(o) * r, y: Math.sin(a) * r, z: c * Math.cos(o) * r } }
    function rot(v) { const ay = -cam.lon * RAD, cy = Math.cos(ay), sy = Math.sin(ay), x = v.x * cy + v.z * sy, z = -v.x * sy + v.z * cy, y = v.y, ax = cam.lat * RAD, cx = Math.cos(ax), sx = Math.sin(ax); return { x, y: y * cx - z * sx, z: y * sx + z * cx } }
    function proj(v) { const q = rot(v), base = Math.min(EW, EH) * .34 * cam.zoom, pers = 1 + .14 * q.z; return { x: EW * cam.x + q.x * base * pers, y: EH * cam.y - q.y * base * pers, z: q.z, scale: base * pers } }
    function norm(v) { const m = Math.hypot(v.x, v.y, v.z) || 1; return { x: v.x / m, y: v.y / m, z: v.z / m } }
    function setCam(v) {
        let a = cams[0], b = cams.at(-1); for (let i = 0; i < cams.length - 1; i++)if (v >= cams[i].p && v <= cams[i + 1].p) { a = cams[i]; b = cams[i + 1]; break }
        const u = smooth(clamp((v - a.p) / (b.p - a.p || 1))); for (const k of ['lon', 'lat', 'zoom', 'x', 'y', 'activity', 'mesh', 'dissolve']) cam[k] = lerp(a[k], b[k], u);
        if (mobile.matches) { cam.x = .5; cam.y = .29; cam.zoom *= .82; }
    }
    function arcPoint(route, t) {
        const A = nodes[route.a], B = nodes[route.b], a = vec(A.lat + route.j * .18, A.lon + route.j * .3), b = vec(B.lat - route.j * .18, B.lon - route.j * .3), dot = clamp(a.x * b.x + a.y * b.y + a.z * b.z, -1, 1), om = Math.acos(dot); let v;
        if (om < .001) v = { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: lerp(a.z, b.z, t) }; else { const so = Math.sin(om), u = Math.sin((1 - t) * om) / so, w = Math.sin(t * om) / so; v = { x: a.x * u + b.x * w, y: a.y * u + b.y * w, z: a.z * u + b.z * w } }
        v = norm(v); const rr = 1 + Math.sin(PI * t) * route.lift; v.x *= rr; v.y *= rr; v.z *= rr; return v;
    }
    function focusRegion() { if (earthStage !== 2) return earthStage === 3 ? 'mesh' : null; return earthLocal < .35 ? 'south' : earthLocal < .72 ? 'pacific' : 'korea' }
    function currentHotspots() { return hotspotGroups[focusRegion()] || [] }
    function backgroundEarth(t) {
        const g = earthCtx.createRadialGradient(EW * .5, EH * .5, 0, EW * .5, EH * .5, Math.max(EW, EH) * .75); g.addColorStop(0, '#07172a'); g.addColorStop(.45, '#020812'); g.addColorStop(1, '#010207'); earthCtx.fillStyle = g; earthCtx.fillRect(0, 0, EW, EH);
        const entry = 1 - smooth(clamp(earthP / .14)), boost = 1 + scrollSpeed * 6;
        for (const s of earthStars) { const z = .12 + ((s.z + t * .00002 * (.25 + entry * 2.5) * boost) % 1) * .88, m = 1 / z, x = EW * .5 + s.x * EW * .48 * m, y = EH * .5 + s.y * EH * .44 * m; if (x < -20 || x > EW + 20 || y < -20 || y > EH + 20) continue; const a = (.12 + .42 * (1 - z)) * (.6 + entry * .7), sz = s.s * (1.2 - z * .45); earthCtx.fillStyle = `rgba(190,230,255,${a})`; earthCtx.beginPath(); earthCtx.arc(x, y, sz, 0, TAU); earthCtx.fill() }
    }
    function sphere() {
        const c = proj({ x: 0, y: 0, z: 0 }), r = Math.min(EW, EH) * .34 * cam.zoom, g = earthCtx.createRadialGradient(c.x - r * .3, c.y - r * .32, r * .03, c.x, c.y, r * 1.15); g.addColorStop(0, 'rgba(42,140,255,.17)'); g.addColorStop(.55, 'rgba(7,33,65,.23)'); g.addColorStop(.92, 'rgba(1,8,18,.30)'); g.addColorStop(1, 'rgba(0,0,0,0)'); earthCtx.fillStyle = g; earthCtx.beginPath(); earthCtx.arc(c.x, c.y, r * 1.15, 0, TAU); earthCtx.fill(); earthCtx.strokeStyle = `rgba(121,222,255,${.18 + .18 * cam.activity})`; earthCtx.lineWidth = 1.2; earthCtx.beginPath(); earthCtx.arc(c.x, c.y, r, 0, TAU); earthCtx.stroke(); earthCtx.strokeStyle = `rgba(42,140,255,${.08 + .14 * cam.activity})`; earthCtx.lineWidth = Math.max(1, r * .006); earthCtx.beginPath(); earthCtx.arc(c.x, c.y, r * 1.015, 0, TAU); earthCtx.stroke();
    }
    function trace(points, color, w, a) { earthCtx.beginPath(); let open = false; for (const pair of points) { const q = proj(vec(pair[1], pair[0])); if (q.z < -.04) { open = false; continue } if (!open) { earthCtx.moveTo(q.x, q.y); open = true } else earthCtx.lineTo(q.x, q.y) } earthCtx.strokeStyle = color; earthCtx.globalAlpha = a; earthCtx.lineWidth = w; earthCtx.stroke(); earthCtx.globalAlpha = 1 }
    function fillPoly(points, fillStyle, strokeStyle, w) { earthCtx.beginPath(); let open = false; for (const pair of points) { const q = proj(vec(pair[1], pair[0])); if (q.z < -.06) { open = false; continue } if (!open) { earthCtx.moveTo(q.x, q.y); open = true } else earthCtx.lineTo(q.x, q.y) } if (open) { earthCtx.closePath(); earthCtx.fillStyle = fillStyle; earthCtx.fill(); if (strokeStyle) { earthCtx.strokeStyle = strokeStyle; earthCtx.lineWidth = w; earthCtx.stroke() } } }
    function grid() { for (let lat = -60; lat <= 60; lat += 20) { const a = []; for (let lon = -180; lon <= 180; lon += 4)a.push([lon, lat]); trace(a, 'rgba(112,204,255,.40)', .65, .34 * cam.activity) } for (let lon = -160; lon <= 180; lon += 20) { const a = []; for (let lat = -86; lat <= 86; lat += 3)a.push([lon, lat]); trace(a, 'rgba(112,204,255,.34)', .58, .24 * cam.activity) } }
    function geoDistance(a, b, c, d) { const p1 = a * RAD, p2 = c * RAD, dp = (c - a) * RAD, dl = (d - b) * RAD, x = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2; return 2 * Math.atan2(Math.sqrt(x), Math.sqrt(Math.max(0, 1 - x))) }
    function ringHeat(centroid) { let heat = 0; for (const s of currentHotspots()) heat = Math.max(heat, Math.max(0, 1 - geoDistance(centroid.lat, centroid.lon, s.lat, s.lon) / s.radius) * s.intensity); return heat }
    function landBase() { earthCtx.save(); earthCtx.globalCompositeOperation = 'screen'; for (const obj of worldRings) { const heat = ringHeat(obj.centroid), fill = heat > .16 ? `rgba(${182 + Math.round(50 * heat)},${38 + Math.round(30 * heat)},${52 + Math.round(26 * heat)},${.38 + heat * .26})` : 'rgba(17,49,86,.88)'; fillPoly(obj.ring, fill, 'rgba(150,230,255,.34)', .8) } earthCtx.restore() }
    function landDetail(t) {
        earthCtx.save(); earthCtx.globalCompositeOperation = 'lighter'; const focus = focusRegion();
        for (const dot of scatter) { let active = 0; if (earthStage === 2 && dot.group === focus) active = 1; else if (earthStage === 3 && dot.group === 'mesh') active = .55; if (!active) continue; const q = proj(vec(dot.lat, dot.lon)); if (q.z < -.06) continue; const pulse = (Math.sin(t * .004 + dot.phase) + 1) / 2, size = dot.size * (1 + pulse * .85); earthCtx.fillStyle = `rgba(255,70,96,${.12 + active * .28 + pulse * .18})`; earthCtx.beginPath(); earthCtx.arc(q.x, q.y, size, 0, TAU); earthCtx.fill(); if (pulse > .78) { earthCtx.strokeStyle = `rgba(255,255,255,${.06 + active * .1})`; earthCtx.beginPath(); earthCtx.arc(q.x, q.y, size * 3.4, 0, TAU); earthCtx.stroke() } }
        earthCtx.restore(); earthCtx.save(); for (const obj of worldRings) trace(obj.ring.concat([obj.ring[0]]), 'rgba(188,237,255,.72)', .9, .56 * cam.activity); earthCtx.restore();
    }
    function routeAlpha(route) {
        if (earthStage === 0) return 0;
        if (earthStage === 1) return route.group === 'global' ? .24 : route.group === 'defense' ? .10 : .10;
        if (earthStage === 2) { const focus = focusRegion(); if (route.group === focus) return 1; if (route.group === 'mideast') return .10; if (route.group === 'global') return .05; return .025 }
        if (earthStage === 3) { if (route.group === 'defense') return 1; if (['south', 'pacific', 'korea'].includes(route.group)) return .16; if (route.group === 'mideast') return .04; return .08 }
        return route.group === 'defense' ? .08 * (1 - cam.dissolve) : .025 * (1 - cam.dissolve);
    }
    function endpointGlow(node, rgb, a) { const q = proj(vec(node.lat, node.lon)); if (q.z < -.08) return; earthCtx.save(); earthCtx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 3; i++) { earthCtx.strokeStyle = `rgba(${rgb},${a * (.30 - i * .08)})`; earthCtx.lineWidth = 1; earthCtx.beginPath(); earthCtx.arc(q.x, q.y, 7 + i * 6 + Math.sin((earthFrame + i * 15) * .08) * 1.5, 0, TAU); earthCtx.stroke() } earthCtx.restore() }
    function routeDraw(route, t) {
        const a = routeAlpha(route) * cam.activity; if (a < .008) return; const rgb = route.group === 'defense' || route.color === 'blue' ? '121,222,255' : '255,46,74'; earthCtx.save(); earthCtx.globalCompositeOperation = 'lighter'; earthCtx.beginPath(); let open = false; const pts = [];
        const steps = mobile.matches ? 38 : 58; for (let i = 0; i <= steps; i++) { const q = proj(arcPoint(route, i / steps)); pts.push(q); if (q.z < -.16) { open = false; continue } if (!open) { earthCtx.moveTo(q.x, q.y); open = true } else earthCtx.lineTo(q.x, q.y) }
        earthCtx.strokeStyle = `rgba(${rgb},${a * (route.group === 'defense' ? .18 : .25)})`; earthCtx.lineWidth = route.group === 'defense' ? 2.2 : 3.0; earthCtx.stroke();
        earthCtx.beginPath(); open = false; for (const q of pts) { if (q.z < -.16) { open = false; continue } if (!open) { earthCtx.moveTo(q.x, q.y); open = true } else earthCtx.lineTo(q.x, q.y) } earthCtx.strokeStyle = `rgba(255,255,255,${a * .07})`; earthCtx.lineWidth = .9; earthCtx.stroke();
        const packetCount = mobile.matches ? 1 : (route.group === 'defense' ? 3 : 4), speedBoost = 1 + scrollSpeed * 4.5;
        for (let k = 0; k < packetCount; k++) { const tt = (t * .001 * route.speed * speedBoost + route.phase + k / packetCount) % 1, q = proj(arcPoint(route, tt)); if (q.z < -.12) continue; const prev = proj(arcPoint(route, Math.max(0, tt - .03))), tail = earthCtx.createLinearGradient(prev.x, prev.y, q.x, q.y); tail.addColorStop(0, `rgba(${rgb},0)`); tail.addColorStop(1, `rgba(${rgb},${a * .9})`); earthCtx.strokeStyle = tail; earthCtx.lineWidth = 2.1; earthCtx.beginPath(); earthCtx.moveTo(prev.x, prev.y); earthCtx.lineTo(q.x, q.y); earthCtx.stroke(); const sz = 3.5, g = earthCtx.createRadialGradient(q.x, q.y, 0, q.x, q.y, sz * 6); g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(.14, `rgba(${rgb},${a})`); g.addColorStop(.5, `rgba(${rgb},${a * .34})`); g.addColorStop(1, `rgba(${rgb},0)`); earthCtx.fillStyle = g; earthCtx.beginPath(); earthCtx.arc(q.x, q.y, sz * 6, 0, TAU); earthCtx.fill() }
        endpointGlow(nodes[route.a], rgb, a * .46); endpointGlow(nodes[route.b], rgb, a * .46); earthCtx.restore();
    }
    function mesh() { if (cam.mesh < .03) return; const visible = nodeList.map(n => ({ n, q: proj(vec(n.lat, n.lon)) })).filter(o => o.q.z > .05); earthCtx.save(); earthCtx.globalCompositeOperation = 'lighter'; for (let i = 0; i < visible.length; i++)for (let j = i + 1; j < visible.length; j++) { const d = Math.hypot(visible[i].q.x - visible[j].q.x, visible[i].q.y - visible[j].q.y), max = Math.min(EW, EH) * .34; if (d > max) continue; earthCtx.strokeStyle = `rgba(121,222,255,${(1 - d / max) * .16 * cam.mesh})`; earthCtx.lineWidth = .7; earthCtx.beginPath(); earthCtx.moveTo(visible[i].q.x, visible[i].q.y); earthCtx.lineTo(visible[j].q.x, visible[j].q.y); earthCtx.stroke() } earthCtx.restore() }
    function nodesDraw(t) {
        const focus = focusRegion(); earthCtx.save(); earthCtx.globalCompositeOperation = 'lighter'; nodeList.forEach((n, i) => { const q = proj(vec(n.lat, n.lon)); if (q.z < -.05) return; let active = .10; if (earthStage === 2 && n.group === focus) active = .96; else if (earthStage === 3) active = n.group === 'mideast' ? .25 : .50; else if (earthStage === 1 && n.group !== 'minor') active = .25; else if (n.group === 'minor') active = .05; const pulse = (Math.sin(t * .003 + n.lat * .1 + i) + 1) / 2, rr = 1.3 + (active > .6 ? 2.5 : 1.1) * pulse, rgb = active > .6 ? '255,74,98' : '121,222,255', g = earthCtx.createRadialGradient(q.x, q.y, 0, q.x, q.y, rr * 6); g.addColorStop(0, `rgba(255,255,255,${.4 + active * .5})`); g.addColorStop(.24, `rgba(${rgb},${.18 + active * .7})`); g.addColorStop(1, `rgba(${rgb},0)`); earthCtx.fillStyle = g; earthCtx.beginPath(); earthCtx.arc(q.x, q.y, rr * 6, 0, TAU); earthCtx.fill(); earthCtx.fillStyle = `rgba(${rgb},${.35 + active * .5})`; earthCtx.beginPath(); earthCtx.arc(q.x, q.y, 1.1 + active * 1.6, 0, TAU); earthCtx.fill() }); earthCtx.restore();
    }
    function updateEarthScroll() {
        if (!earthSection) return;
        earthTargetP = reduce.matches ? .72 : progressFor(earthSection);
    }
    function applyEarthScroll(force = false) {
        if (!earthSection) return;
        if (force) earthP = earthTargetP;
        const nextStage = stageFor(earthP, earthEdges);
        earthLocal = localFor(earthP, earthEdges, nextStage);
        if (nextStage !== earthStage || force) {
            earthStage = nextStage;
            activateChapters(earthSection, '.earth-chapter', '.earth-rail button', earthStage);
        }
        setCam(earthP);
    }
    function renderEarth(t) {
        if (!earthCtx || !earthVisible) return; setCam(earthP); backgroundEarth(t); sphere(); grid(); landBase(); landDetail(t); routes.forEach(r => routeDraw(r, t)); mesh(); nodesDraw(t); earthFrame++;
    }
    bindRail(earthSection, earthEdges);

    /* -----------------------------------------------------------
       DENSER TRANSFORMER / WEIGHT VISUALIZATION
    ------------------------------------------------------------ */
    const llmSection = document.getElementById('systems-flight'), llmEdges = [0, .16, .34, .52, .70, .86, 1];
    const tokenEls = [...document.querySelectorAll('#llmTokens span')], embedRows = [...document.querySelectorAll('.embedding-row')], blocks = [...document.querySelectorAll('.transformer-block')], responseTokens = [...document.querySelectorAll('#decodedResponse span')], residualFill = document.getElementById('residualFill');
    const mathEls = [...document.querySelectorAll('#llmMathStrip [data-math-stage]')], headEls = [...document.querySelectorAll('#llmHeadBank [data-head]')], attentionCells = [...document.querySelectorAll('#attentionMatrix span')], weightMatrices = [...document.querySelectorAll('.weight-matrix')], weightCells = [...document.querySelectorAll('.weight-matrix i')], mask = document.getElementById('causalMask'), residualEquations = document.getElementById('llmResidualEquations'), mlpFlow = document.getElementById('llmMlpFlow'), unembedding = document.querySelector('.llm-unembedding');
    let llmP = 0, llmTargetP = 0, llmStage = 0, llmLocal = 0, llmVisible = false;
    function updateLLM() {
        if (!llmSection) return;
        llmTargetP = reduce.matches ? .92 : progressFor(llmSection);
    }
    function applyLLM(force = false) {
        if (!llmSection) return;
        if (force) llmP = llmTargetP;
        const nextStage = stageFor(llmP, llmEdges);
        llmLocal = localFor(llmP, llmEdges, nextStage);
        if (nextStage !== llmStage || force) {
            llmStage = nextStage;
            activateChapters(llmSection, '.llm-chapter', '.llm-rail button', llmStage);
        }
        const tokenCount = Math.ceil(clamp(llmP / .18) * tokenEls.length); tokenEls.forEach((e, i) => e.classList.toggle('active', i < tokenCount));
        const embedCount = Math.ceil(clamp((llmP - .12) / .24) * embedRows.length); embedRows.forEach((e, i) => e.classList.toggle('active', i < embedCount));
        const blockP = clamp((llmP - .46) / .30); blocks.forEach((b, i) => { const q = clamp(blockP * blocks.length - i); b.classList.toggle('active', q > 0); const bar = b.querySelector('b'); if (bar) bar.style.width = (q * 100) + '%' }); if (residualFill) residualFill.style.width = (clamp((llmP - .28) / .48) * 100) + '%';
        const outCount = Math.ceil(clamp((llmP - .84) / .16) * responseTokens.length); responseTokens.forEach((e, i) => e.classList.toggle('active', i < outCount));
        mathEls.forEach((e, i) => e.classList.toggle('active', i === llmStage));
        weightMatrices.forEach((e, i) => e.classList.toggle('active', llmStage >= 2 && i <= Math.min(3, llmStage - 1)));
        mask?.classList.toggle('active', llmStage >= 2); residualEquations?.classList.toggle('active', llmStage >= 3); mlpFlow?.classList.toggle('active', llmStage >= 3); unembedding?.classList.toggle('active', llmStage >= 4);
    }
    function animateLLM(t) {
        if (!llmVisible) return;
        const activeHeads = llmStage < 2 ? Math.max(1, Math.ceil(clamp((llmP - .16) / .20) * 4)) : 12;
        headEls.forEach((el, i) => { const wave = (Math.sin(t * .0024 + i * .83 + llmStage * .7) + 1) * .5, focus = .30 + .56 * Math.max(0, 1 - Math.abs((i % 6) - (llmStage % 6)) * .18), score = clamp((i < activeHeads ? focus : .06) + wave * .12, 0, 1); el.classList.toggle('active', i < activeHeads); el.style.setProperty('--head-score', (score * 100).toFixed(1) + '%'); const label = el.querySelector('em'); if (label) label.textContent = score.toFixed(2) });
        if (llmStage >= 2) attentionCells.forEach((cell, i) => { const r = Math.floor(i / 6), c = i % 6, causal = c <= r ? 1 : .12, wave = (Math.sin(t * .002 + i * .47 + llmStage) + 1) * .5, strength = clamp(causal * (.28 + wave * .66)); cell.style.opacity = (.18 + strength * .82).toFixed(3); cell.style.transform = `scale(${.88 + strength * .12})`; cell.style.boxShadow = `0 0 ${Math.round(2 + strength * 9)}px rgba(121,222,255,${(.02 + strength * .12).toFixed(3)})` });
        if (llmStage >= 2) weightCells.forEach((cell, i) => { const w = parseFloat(cell.dataset.weight || '.2'), pulse = (Math.sin(t * .0017 + i * .31) + 1) * .5; cell.style.opacity = (.36 + w * .42 + pulse * .18).toFixed(3) });
    }
    bindRail(llmSection, llmEdges);

    /* GPU exploded-view scroll state. */
    const gpuSection = document.getElementById('a100-flight'), gpuEdges = [0, .20, .40, .62, .82, 1];
    const rig = document.getElementById('gpuRig'), shellTop = document.getElementById('gpuShellTop'), shellBottom = document.getElementById('gpuShellBottom'), heatsink = document.getElementById('gpuHeatsink'), board = document.getElementById('gpuBoard'), gpuPackage = document.querySelector('.gpu-package'), lid = document.getElementById('gpuPackageLid'), die = document.getElementById('gpuDie');
    let gpuP = 0, gpuTargetP = 0, gpuStage = -1, gpuVisible = false;
    function updateGPU() {
        if (!gpuSection || !rig) return;
        gpuTargetP = reduce.matches ? .90 : progressFor(gpuSection);
    }
    function applyGPU(force = false) {
        if (!gpuSection || !rig) return;
        if (force) gpuP = gpuTargetP;
        const p = gpuP, s = stageFor(p, gpuEdges);
        if (s !== gpuStage || force) { gpuStage = s; activateChapters(gpuSection, '.gpu-chapter', '.gpu-rail button', s); }
        const shell = smooth(clamp((p - .10) / .22)), cool = smooth(clamp((p - .26) / .24)), face = smooth(clamp((p - .34) / .30)), packageP = smooth(clamp((p - .50) / .23)), zoom = smooth(clamp((p - .78) / .22));
        const compact = mobile.matches;
        const shellTravel = compact ? 82 : 125, bottomTravel = compact ? 62 : 88, sinkTravel = compact ? 64 : 94, lidTravel = compact ? 62 : 92;
        const shellDepth = compact ? 58 : 82, bottomDepth = compact ? 48 : 58, sinkDepth = compact ? 52 : 72, lidDepth = compact ? 70 : 98;
        const shellSide = packageP * (compact ? 14 : 38), sinkSide = packageP * (compact ? 30 : 82), lidSide = packageP * (compact ? 8 : 18);
        const zoomShellX = zoom * (compact ? 46 : 170), zoomSinkX = zoom * (compact ? 62 : 205), zoomBackX = zoom * (compact ? 38 : 120);
        shellTop.style.transform = `translate3d(${shellSide + zoomShellX}px,${-shell * shellTravel - zoom * (compact ? 28 : 72)}px,${110 + shell * shellDepth}px) rotateX(${-shell * (compact ? 6 : 8)}deg)`;
        shellBottom.style.transform = `translate3d(${-shellSide * .35 - zoomBackX}px,${shell * bottomTravel + zoom * (compact ? 34 : 74)}px,${-85 - shell * bottomDepth}px) rotateX(${shell * (compact ? 4 : 6)}deg)`;
        shellTop.style.opacity = String(clamp(1 - zoom * (compact ? 1.12 : 1.36), .04, 1)); shellBottom.style.opacity = String(clamp(1 - zoom * (compact ? 1.02 : 1.25), .04, 1));
        heatsink.style.transform = `translate3d(${-sinkSide - zoomSinkX}px,${-cool * sinkTravel - zoom * (compact ? 30 : 74)}px,${55 + cool * sinkDepth}px) rotateX(${-cool * (compact ? 4 : 6)}deg)`;
        heatsink.style.opacity = String(clamp(1 - packageP * (compact ? .06 : .08) - zoom * (compact ? 1.04 : 1.30), .04, 1));
        board.style.transform = `rotateX(${58 - face * 48}deg) translateZ(${-25 + face * 45 + zoom * (compact ? 16 : 30)}px) scale(${.92 + face * .08 + zoom * (compact ? .025 : .04)})`;
        if (gpuPackage) gpuPackage.style.transform = `translate3d(0,${-zoom * (compact ? 4 : 10)}px,${zoom * (compact ? 42 : 76)}px) scale(${1 + zoom * (compact ? .25 : .38)})`;
        lid.style.transform = `translate3d(${lidSide + zoom * (compact ? 12 : 30)}px,${-packageP * lidTravel - zoom * (compact ? 28 : 64)}px,${28 + packageP * lidDepth + zoom * (compact ? 34 : 76)}px) rotateX(${-packageP * (compact ? 5 : 7)}deg)`;
        lid.style.opacity = String(clamp(1 - zoom * (compact ? 1.18 : 1.45), 0, 1));
        die.style.opacity = String(.12 + packageP * .88); die.style.transform = `scale(${.82 + packageP * .18 + zoom * (compact ? .48 : .62)}) translateY(${-zoom * (compact ? 3 : 4)}px)`;
        rig.style.transform = `translate(-50%,-50%) rotateX(${8 - face * 2}deg) rotateY(${-10 + face * 7}deg) scale(${1 + zoom * (compact ? .08 : .12)}) translateY(${-zoom * (compact ? 2 : 3)}%)`;
    }
    bindRail(gpuSection, gpuEdges);

    /* Visibility and coordinated lifecycle. */
    if (earthSection) new IntersectionObserver(entries => { earthVisible = entries.some(e => e.isIntersecting) && !document.hidden; if (earthVisible) { resizeEarth(); updateEarthScroll(); earthP = earthTargetP; applyEarthScroll(true); renderEarth(performance.now()) } }, { rootMargin: '30% 0px' }).observe(earthSection);
    if (llmSection) new IntersectionObserver(entries => { llmVisible = entries.some(e => e.isIntersecting) && !document.hidden; if (llmVisible) { updateLLM(); llmP = llmTargetP; applyLLM(true) } }, { rootMargin: '30% 0px' }).observe(llmSection);
    if (gpuSection) new IntersectionObserver(entries => { gpuVisible = entries.some(e => e.isIntersecting) && !document.hidden; if (gpuVisible) { updateGPU(); gpuP = gpuTargetP; applyGPU(true) } }, { rootMargin: '30% 0px' }).observe(gpuSection);

    let scrollScheduled = false;
    function updateScrollState() { scrollScheduled = false; updateEarthScroll(); updateLLM(); updateGPU() }
    function onScroll() {
        const now = performance.now(), y = scrollY || 0, dt = Math.max(8, now - lastScrollT), instant = Math.min(1.8, Math.abs(y - lastScrollY) / dt * .055);
        scrollSpeedTarget = Math.max(scrollSpeedTarget, instant); lastScrollY = y; lastScrollT = now;
        if (!scrollScheduled) { scrollScheduled = true; requestAnimationFrame(updateScrollState) }
    }
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', () => { resizeSpace(); resizeEarth(); onScroll() }, { passive: true });
    function sectionNearViewport(section) { if (!section) return false; const r = section.getBoundingClientRect(); return r.bottom > -innerHeight * .3 && r.top < innerHeight * 1.3 }
    document.addEventListener('visibilitychange', () => { if (document.hidden) { earthVisible = false; llmVisible = false } else { earthVisible = sectionNearViewport(earthSection); llmVisible = sectionNearViewport(llmSection); onScroll() } });
    reduce.addEventListener?.('change', onScroll); mobile.addEventListener?.('change', () => { resizeSpace(); resizeEarth(); onScroll() });

    let lastFrameTime = performance.now();
    function frame(t) {
        const dt = Math.min(50, Math.max(1, t - lastFrameTime)); lastFrameTime = t;
        if (!document.hidden) {
            const damping = reduce.matches ? 1 : 1 - Math.exp(-dt / 92);
            earthP = lerp(earthP, earthTargetP, damping);
            llmP = lerp(llmP, llmTargetP, damping);
            gpuP = lerp(gpuP, gpuTargetP, damping);
            drawSpace(dt);
            if (earthVisible) { applyEarthScroll(); renderEarth(t) }
            if (llmVisible) { applyLLM(); animateLLM(t) }
            if (gpuVisible) applyGPU();
        }
        requestAnimationFrame(frame);
    }

    resizeSpace(); resizeEarth(); updateEarthScroll(); updateLLM(); updateGPU();
    earthP = earthTargetP; llmP = llmTargetP; gpuP = gpuTargetP;
    applyEarthScroll(true); applyLLM(true); applyGPU(true);
    requestAnimationFrame(frame);
})();
(function () {
    'use strict';
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const candidates = [...document.querySelectorAll('section, .form-card')].filter(el => !el.closest('#signal-map .signal-chapter'));
    const themeMap = { glance: 'analytics', sponsor: 'target', 'actual-work': 'offense', 'why-join': 'analytics', program: 'offense', ai: 'target', meetings: 'analytics', 'signal-map': 'offense' };
    const themed = []; let compactCount = 0;
    candidates.forEach((section, index) => {
        if (section.id === 'signal-map') return;
        let theme = themeMap[section.id] || '';
        if (!theme) { if (section.classList.contains('form-card')) theme = 'offense'; else if (section.classList.contains('compact')) { theme = compactCount % 2 === 0 ? 'target' : 'analytics'; compactCount++; } else theme = index % 3 === 0 ? 'offense' : index % 3 === 1 ? 'analytics' : 'target'; }
        section.classList.add('ops-layered'); section.dataset.opsTheme = theme;
        if (!section.querySelector('.ops-aura')) {
            const aura = document.createElement('div'); aura.className = 'ops-aura';
            const auraTwo = document.createElement('div'); auraTwo.className = 'ops-aura-two';
            const canvas = document.createElement('canvas'); canvas.className = 'ops-field-canvas';
            section.prepend(canvas); section.prepend(auraTwo); section.prepend(aura);
            themed.push({ section, canvas, theme });
        }
    });
    const cardSelector = '.activity-card,.benefit-card,.card,.cred-item,.panel,.meeting-card,.faq-item,.signal-card,.form-card,.signal-metric';
    [...document.querySelectorAll(cardSelector)].filter(card => !card.classList.contains('ops-card-shell')).forEach(card => {
        card.classList.add('ops-card-shell');['tl', 'tr', 'bl', 'br'].forEach(pos => { const c = document.createElement('span'); c.className = 'ops-corner ' + pos; card.appendChild(c); });
        if (reduce) return;
        let raf = 0;
        card.addEventListener('pointermove', ev => { const r = card.getBoundingClientRect(), px = (ev.clientX - r.left) / r.width - .5, py = (ev.clientY - r.top) / r.height - .5; cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { card.style.transform = 'perspective(1100px) rotateX(' + (-py * 5.5) + 'deg) rotateY(' + (px * 6.5) + 'deg) translateY(-4px)'; }); });
        card.addEventListener('pointerleave', () => { cancelAnimationFrame(raf); card.style.transform = ''; });
    });
    const io = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('ops-live'); }), { threshold: .16 });
    document.querySelectorAll('.ops-layered,.ops-card-shell').forEach(el => io.observe(el));
    if (reduce || !themed.length) return;

    function rand(a, b) { return Math.random() * (b - a) + a; }
    function palette(theme) {
        if (theme === 'offense') return { mode: 'offense', red: '255,70,96', blue: '121,222,255', grid: 'rgba(255,70,96,.05)', grid2: 'rgba(121,222,255,.03)', scan: 'rgba(255,78,110,.14)' };
        if (theme === 'analytics') return { mode: 'analytics', red: '255,70,96', blue: '121,222,255', grid: 'rgba(121,222,255,.06)', grid2: 'rgba(255,255,255,.026)', scan: 'rgba(121,222,255,.12)' };
        return { mode: 'target', red: '255,255,255', blue: '255,70,96', grid: 'rgba(255,255,255,.035)', grid2: 'rgba(255,70,96,.03)', scan: 'rgba(255,255,255,.10)' };
    }
    const TAU = Math.PI * 2;
    const fields = themed.map(item => ({
        section: item.section, canvas: item.canvas, ctx: item.canvas.getContext('2d'), palette: palette(item.theme), visible: true, w: 1, h: 1, dpr: 1, data: {
            streaks: Array.from({ length: 9 }, () => ({ x: Math.random(), y: Math.random(), len: rand(.08, .22), speed: rand(.0006, .0016), thick: rand(1, 2.2) })),
            boxes: Array.from({ length: 6 }, () => ({ x: rand(.12, .82), y: rand(.14, .82), w: rand(.09, .18), h: rand(.06, .14), dx: rand(-.00018, .00018), dy: rand(-.00018, .00018), phase: rand(0, TAU) })),
            bars: Array.from({ length: 9 }, (_, i) => ({ x: .1 + i * .09, w: rand(.03, .06), h: rand(.2, .78), phase: rand(0, TAU) })),
            waves: Array.from({ length: 3 }, () => ({ phase: rand(0, TAU), amp: rand(10, 24), offset: rand(.22, .78) })),
            blips: Array.from({ length: 12 }, () => ({ a: rand(0, TAU), r: rand(.16, .42), pulse: rand(0, TAU), ring: Math.random() > .5 ? 1 : 2 }))
        }
    }));
    function resize(f) { const r = f.section.getBoundingClientRect(); f.w = Math.max(1, Math.round(r.width)); f.h = Math.max(1, Math.round(r.height)); f.dpr = Math.min(devicePixelRatio || 1, 1.35); f.canvas.width = Math.round(f.w * f.dpr); f.canvas.height = Math.round(f.h * f.dpr); f.ctx.setTransform(f.dpr, 0, 0, f.dpr, 0, 0); }
    const visObs = new IntersectionObserver(entries => entries.forEach(entry => { const f = fields.find(v => v.section === entry.target); if (f) f.visible = entry.isIntersecting; }), { rootMargin: '160px 0px' });
    fields.forEach(f => { resize(f); visObs.observe(f.section); }); addEventListener('resize', () => fields.forEach(resize), { passive: true });
    function commonGrid(ctx, w, h, p, t) { ctx.save(); for (let x = -(t * .02 % 54); x < w + 54; x += 54) { ctx.strokeStyle = p.grid; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); } for (let y = -(t * .014 % 54); y < h + 54; y += 54) { ctx.strokeStyle = p.grid2; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); } ctx.restore(); }
    function drawOffense(f, t) { const { ctx, w, h, palette: p, data: d } = f; commonGrid(ctx, w, h, p, t); ctx.save(); ctx.globalCompositeOperation = 'lighter'; d.streaks.forEach((s, idx) => { s.x = (s.x + s.speed) % 1; const x = s.x * w, y = (s.y * h + (t * .015 * (idx % 2 ? 1 : -1))) % h; const grad = ctx.createLinearGradient(x, y, x + w * s.len, y - h * s.len * .7); grad.addColorStop(0, 'rgba(' + p.red + ',0)'); grad.addColorStop(.42, 'rgba(' + p.red + ',.28)'); grad.addColorStop(1, 'rgba(255,255,255,0)'); ctx.strokeStyle = grad; ctx.lineWidth = s.thick; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w * s.len, y - h * s.len * .7); ctx.stroke(); }); d.boxes.forEach(box => { box.x += box.dx; box.y += box.dy; if (box.x < .08 || box.x > .88) box.dx *= -1; if (box.y < .10 || box.y > .86) box.dy *= -1; const x = box.x * w, y = box.y * h, bw = box.w * w, bh = box.h * h, pulse = (Math.sin(t * .002 + box.phase) + 1) / 2; ctx.strokeStyle = 'rgba(' + p.blue + ',' + (.14 + pulse * .18) + ')'; ctx.lineWidth = 1; ctx.strokeRect(x, y, bw, bh); ctx.strokeStyle = 'rgba(' + p.red + ',' + (.14 + pulse * .22) + ')'; ctx.beginPath(); ctx.moveTo(x - 10, y + bh * .5); ctx.lineTo(x, y + bh * .5); ctx.moveTo(x + bw, y + bh * .5); ctx.lineTo(x + bw + 10, y + bh * .5); ctx.moveTo(x + bw * .5, y - 10); ctx.lineTo(x + bw * .5, y); ctx.moveTo(x + bw * .5, y + bh); ctx.lineTo(x + bw * .5, y + bh + 10); ctx.stroke(); }); const sweepX = (t * .065) % (w * 1.7) - w * .3; const sweep = ctx.createLinearGradient(sweepX, 0, sweepX + w * .22, 0); sweep.addColorStop(0, 'rgba(255,255,255,0)'); sweep.addColorStop(.55, p.scan); sweep.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = sweep; ctx.fillRect(0, 0, w, h); ctx.restore(); }
    function drawAnalytics(f, t) { const { ctx, w, h, palette: p, data: d } = f; commonGrid(ctx, w, h, p, t); ctx.save(); ctx.globalCompositeOperation = 'lighter'; d.bars.forEach((bar, i) => { const bh = (.18 + ((Math.sin(t * .0026 + bar.phase) + 1) / 2) * bar.h) * h * .62; const x = bar.x * w, bw = bar.w * w, y = h * .82 - bh; const g = ctx.createLinearGradient(0, y, 0, y + bh); g.addColorStop(0, 'rgba(' + p.blue + ',.34)'); g.addColorStop(1, 'rgba(' + p.blue + ',.02)'); ctx.fillStyle = g; ctx.fillRect(x, y, bw, bh); ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.strokeRect(x, y, bw, bh); }); d.waves.forEach((wave, idx) => { ctx.strokeStyle = 'rgba(' + (idx % 2 ? p.blue : p.red) + ',' + (.18 + idx * .05) + ')'; ctx.lineWidth = 1.2; ctx.beginPath(); for (let x = 0; x <= w; x += 8) { const y = h * (wave.offset) + Math.sin(x * .02 + t * .0018 + wave.phase) * wave.amp + Math.sin(x * .006 + t * .001 + wave.phase * 1.3) * wave.amp * .4; if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke(); }); for (let i = 0; i < 6; i++) { const x = 18 + i * (w / 6), y = 16 + (Math.sin(t * .001 + i) * 8 + 8); ctx.fillStyle = 'rgba(' + p.blue + ',.12)'; ctx.fillRect(x, y, Math.max(28, w * .08), 6); } const sweepY = (t * .045) % (h * 1.5) - h * .2; const sweep = ctx.createLinearGradient(0, sweepY, 0, sweepY + h * .14); sweep.addColorStop(0, 'rgba(255,255,255,0)'); sweep.addColorStop(.5, p.scan); sweep.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = sweep; ctx.fillRect(0, 0, w, h); ctx.restore(); }
    function drawTarget(f, t) { const { ctx, w, h, palette: p, data: d } = f; commonGrid(ctx, w, h, p, t); const cx = w * .5, cy = h * .5, r = Math.min(w, h) * .34; ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let i = 1; i <= 4; i++) { ctx.strokeStyle = 'rgba(' + p.red + ',' + (.04 + i * .03) + ')'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, r * (i / 4), 0, TAU); ctx.stroke(); } const ang = t * .00055; ctx.strokeStyle = 'rgba(' + p.blue + ',.28)'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, ang, ang + .42); ctx.closePath(); ctx.stroke(); const sweep = ctx.createRadialGradient(cx, cy, 0, cx, cy, r); sweep.addColorStop(0, 'rgba(' + p.red + ',.02)'); sweep.addColorStop(.74, 'rgba(' + p.red + ',0)'); sweep.addColorStop(1, 'rgba(' + p.red + ',0)'); ctx.fillStyle = sweep; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, ang, ang + .42); ctx.closePath(); ctx.fill(); d.blips.forEach((b, idx) => { const pulse = (Math.sin(t * .002 + b.pulse) + 1) / 2, rr = r * b.r, x = cx + Math.cos(b.a + ang * .15) * rr, y = cy + Math.sin(b.a + ang * .15) * rr; ctx.fillStyle = 'rgba(' + p.blue + ',' + (.12 + pulse * .28) + ')'; ctx.beginPath(); ctx.arc(x, y, 1.6 + pulse * 2.2, 0, TAU); ctx.fill(); if (idx % 3 === 0) { ctx.strokeStyle = 'rgba(' + p.red + ',' + (.08 + pulse * .12) + ')'; ctx.strokeRect(x - 8 - pulse * 4, y - 8 - pulse * 4, 16 + pulse * 8, 16 + pulse * 8); } }); ctx.restore(); }
    function drawField(f, t) { if (!f.visible) return; const { ctx, w, h, palette: p } = f; ctx.clearRect(0, 0, w, h); const bg = ctx.createRadialGradient(w * .5, h * .45, 0, w * .5, h * .5, Math.max(w, h) * .88); bg.addColorStop(0, 'rgba(12,18,28,.12)'); bg.addColorStop(1, 'rgba(12,18,28,0)'); ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h); if (p.mode === 'offense') drawOffense(f, t); else if (p.mode === 'analytics') drawAnalytics(f, t); else drawTarget(f, t); }
    function loop(t) { fields.forEach(f => drawField(f, t)); requestAnimationFrame(loop); } requestAnimationFrame(loop);
})();
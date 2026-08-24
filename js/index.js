(function () {
    const root = document.documentElement;
    const progress = document.querySelector(".progress span");
    const nav = document.querySelector(".nav");
    const toggle = document.querySelector(".nav-toggle");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const parallax = [...document.querySelectorAll("[data-parallax]")];
    function setScroll() {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const y = window.scrollY || 0;
        const pct = max > 0 ? Math.min(100, Math.max(0, y / max * 100)) : 0;
        root.style.setProperty("--p", (pct / 100).toFixed(4));
        if (progress) progress.style.width = pct + "%";
        if (nav) nav.classList.toggle("scrolled", y > 24);
        if (!reduce) {
            parallax.forEach(item => {
                const speed = Number(item.dataset.parallax || 0.08);
                const rect = item.getBoundingClientRect();
                const offset = (rect.top - window.innerHeight * .5) * speed;
                item.style.transform = "translate3d(0," + (-offset).toFixed(1) + "px,0)";
            });
        }
    }
    let scrollFrame = 0;
    const scheduleScroll = () => {
        if (scrollFrame) return;
        scrollFrame = requestAnimationFrame(() => { scrollFrame = 0; setScroll(); });
    };
    setScroll();
    window.addEventListener("scroll", scheduleScroll, { passive: true });
    window.addEventListener("resize", scheduleScroll, { passive: true });
    if (toggle && nav) {
        toggle.addEventListener("click", () => {
            const open = nav.classList.toggle("open");
            toggle.setAttribute("aria-expanded", open ? "true" : "false");
        });
        nav.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
            nav.classList.remove("open");
            toggle.setAttribute("aria-expanded", "false");
        }));
    }
    const reveal = [...document.querySelectorAll(".reveal,.reveal-scale")];
    if (reduce) {
        reveal.forEach(item => item.classList.add("visible"));
    } else {
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("visible");
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: .14, rootMargin: "0px 0px -9% 0px" });
        reveal.forEach((item, index) => {
            item.style.setProperty("--d", index % 7);
            observer.observe(item);
        });
        window.addEventListener("pointermove", event => {
            root.style.setProperty("--mx", ((event.clientX / window.innerWidth) - .5).toFixed(3));
            root.style.setProperty("--my", ((event.clientY / window.innerHeight) - .5).toFixed(3));
        }, { passive: true });
    }

    const counters = [...document.querySelectorAll("[data-counter]")];
    function finishCounter(el) {
        const value = Number(el.dataset.counter || 0);
        const prefix = el.dataset.prefix || "";
        el.textContent = prefix + String(value);
    }
    function animateCounter(el) {
        if (el.dataset.done) return;
        el.dataset.done = "true";
        const value = Number(el.dataset.counter || 0);
        const prefix = el.dataset.prefix || "";
        const duration = 1400;
        const start = performance.now();
        function frame(now) {
            const progress = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - progress, 4);
            const current = Math.round(value * eased);
            el.textContent = prefix + String(current);
            if (progress < 1) requestAnimationFrame(frame);
            else finishCounter(el);
        }
        requestAnimationFrame(frame);
    }
    if (counters.length) {
        if (reduce) {
            counters.forEach(finishCounter);
        } else {
            const counterObserver = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        animateCounter(entry.target);
                        counterObserver.unobserve(entry.target);
                    }
                });
            }, { threshold: .55 });
            counters.forEach(item => counterObserver.observe(item));
        }
    }

})();
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
})();

const SUPABASE_URL = "https://xgvqmtumbtfvfuxodbhz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhndnFtdHVtYnRmdmZ1eG9kYmh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NTMxNTgsImV4cCI6MjA4NTEyOTE1OH0.qxiyoFRVmtD-P4T92u0hvaIR-tqhOj6PmsUzhOAcPuE";
const form = document.getElementById("applicationForm");
const statusEl = document.getElementById("formStatus");
const submitBtn = document.getElementById("submitBtn");
if (form) {
    form.addEventListener("submit", async event => {
        event.preventDefault();
        statusEl.textContent = "Submitting...";
        statusEl.className = "status";
        submitBtn.disabled = true;
        try {
            if (!window.supabase) throw new Error("Supabase did not load. Check your connection and try again.");
            const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
            const data = new FormData(form);
            const fields = { full_name: String(data.get("full_name") || "").trim(), grade: String(data.get("grade") || ""), email: String(data.get("email") || "").trim(), experience: String(data.get("experience") || "").trim(), help_manage: String(data.get("help_manage") || ""), meeting_day: String(data.get("meeting_day") || ""), why_join: String(data.get("why_join") || "").trim() };
            const result = await db.from("applications1").insert([fields]);
            if (result.error) throw result.error;
            statusEl.textContent = "Submitted. Join Discord for updates.";
            statusEl.classList.add("success");
            form.reset();
        } catch (error) {
            statusEl.textContent = "Error: " + error.message;
            statusEl.classList.add("error");
        }
        submitBtn.disabled = false;
    });
}
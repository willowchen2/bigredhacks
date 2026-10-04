// Shared nav bar: the tabs are the steps of the product. Injected at the top of every page.
(function () {
  const steps = [
    { href: "create.html", label: "Create" },
    { href: "place.html", label: "Place pins" },
    { href: "walk.html", label: "Walk & memorize" },
    { href: "quiz.html", label: "Quiz" }
  ];
  const strip = s => s.replace(/\.html$/, "");
  const here = strip(location.pathname.split("/").pop() || "index");
  const mk = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; };

  const nav = mk("nav", "topnav");
  nav.setAttribute("aria-label", "Main");
  const brand = mk("a", "brand");
  const logo = document.createElement("img");
  logo.src = "favicon.png";
  logo.alt = "";
  logo.className = "brand-logo";
  brand.append(logo, document.createTextNode("Locus Lane"));  brand.href = "index.html";
  nav.appendChild(brand);

  const ul = document.createElement("ul");
  steps.forEach((s, i) => {
    const a = mk(s.soon ? "span" : "a", "step-link" + (s.soon ? " soon" : ""));
    if (s.soon) { a.setAttribute("aria-disabled", "true"); a.title = "Coming soon"; }
    else { a.href = s.href; if (strip(s.href) === here) a.setAttribute("aria-current", "page"); }
    a.append(mk("span", "step-num", String(i + 1)), mk("span", "lbl", s.label));
    if (s.soon) a.append(mk("small", "", "soon"));
    const li = document.createElement("li");
    li.appendChild(a);
    ul.appendChild(li);
  });
  nav.appendChild(ul);

  const auth = mk("div", "auth");
  auth.id = "auth";
  nav.appendChild(auth);
  document.body.prepend(nav);

  const authScript = document.createElement("script");
  authScript.src = "js/auth.js";
  document.head.appendChild(authScript);
})();

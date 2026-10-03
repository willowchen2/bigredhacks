// Shared nav bar: injected at the top of every page.
(function () {
  const links = [
    { href: "index.html", label: "Home" },
    { href: "create.html", label: "Create" },
    { href: "place.html", label: "Place pins" },
    { href: "walk.html", label: "Walk" }
  ];
  const here = location.pathname.split("/").pop() || "index.html";

  const nav = document.createElement("nav");
  nav.className = "topnav";
  nav.setAttribute("aria-label", "Main");

  const brand = document.createElement("a");
  brand.className = "brand";
  brand.href = "index.html";
  brand.textContent = "Locus Lane";
  nav.appendChild(brand);

  const ul = document.createElement("ul");
  links.forEach(l => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = l.href;
    a.textContent = l.label;
    if (l.href === here) a.setAttribute("aria-current", "page");
    li.appendChild(a);
    ul.appendChild(li);
  });
  nav.appendChild(ul);

  document.body.prepend(nav);
})();
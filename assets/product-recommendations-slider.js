// Product recommendations Swiper (Halo theme)

// -------------------------------------------------------------

(function () {
  var CAROUSEL = '.product-recommendations.swiper';
  var SLIDE    = '.swiper-wrapper > .product';

  function ensureVisibilityStyle() {
    if (document.getElementById('rec-swiper-style')) return;
    var s = document.createElement('style');
    s.id = 'rec-swiper-style';
    s.textContent =
      '@media (max-width:1024px){.products-carousels .rec-desk-only{display:none!important}}' +
      '@media (min-width:1025px){.products-carousels .rec-mb-only{display:none!important}}';
    document.head.appendChild(s);
  }

  function makeEl(cls) {
    var el = document.createElement('div');
    el.className = cls;
    return el;
  }

  function build(el) {
    if (el.swiper) return;                       
    var slides = el.querySelectorAll(SLIDE);
    if (!slides.length) return;                  

    var d = el.dataset;
    var perView  = parseInt(d.itemToShow, 10) || 4;
    var loop     = d.infinite === 'true';
    var arrows   = d.itemArrows === 'true';      // desktop
    var arrowsMb = d.itemArrowsMb === 'true';    // mobile
    var dots     = d.itemDots === 'true';        // desktop
    var dotsMb   = d.itemDotsMb === 'true';      // mobile

    slides.forEach(function (s) { s.classList.add('swiper-slide'); });

    ensureVisibilityStyle();

    var navCfg = false, pagCfg = false;
    if (arrows || arrowsMb) {
      var prev = makeEl('swiper-button-prev');
      var next = makeEl('swiper-button-next');
      if (arrows && !arrowsMb) { prev.classList.add('rec-desk-only'); next.classList.add('rec-desk-only'); }
      if (arrowsMb && !arrows) { prev.classList.add('rec-mb-only');   next.classList.add('rec-mb-only'); }
      el.appendChild(prev); el.appendChild(next);
      navCfg = { prevEl: prev, nextEl: next };
    }
    if (dots || dotsMb) {
      var pag = makeEl('swiper-pagination');
      if (dots && !dotsMb) pag.classList.add('rec-desk-only');
      if (dotsMb && !dots) pag.classList.add('rec-mb-only');
      el.appendChild(pag);
      pagCfg = { el: pag, clickable: true };
    }

    new Swiper(el, {
      slidesPerView: 1.5,       
      spaceBetween: 12,
      loop: loop && slides.length > perView,   
      watchOverflow: true,
      navigation: navCfg,
      pagination: pagCfg,
      breakpoints: {
        576:  { slidesPerView: 2,                    spaceBetween: 16 },
        768:  { slidesPerView: Math.min(perView, 3), spaceBetween: 16 },
        1024: { slidesPerView: perView,              spaceBetween: 30 },
      },
    });
  }

  function initAll() {
    if (typeof Swiper === 'undefined') return;
    document.querySelectorAll(CAROUSEL).forEach(build);
  }

  function watch() {
    document.querySelectorAll('[data-recommendations-block]').forEach(function (block) {
      var now = block.querySelector(CAROUSEL);
      if (now && now.querySelector(SLIDE)) { build(now); return; }

      var mo = new MutationObserver(function () {
        if (typeof Swiper === 'undefined') return;
        var c = block.querySelector(CAROUSEL);
        if (c && c.querySelector(SLIDE)) {
          build(c);
          mo.disconnect();
        }
      });
      mo.observe(block, { childList: true, subtree: true });
    });
  }

  function boot() { initAll(); watch(); }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  document.addEventListener('shopify:section:load', boot); // Theme Editor
})();
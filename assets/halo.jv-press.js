(function () {
  // Swiper is loaded (deferred) from CDN in theme.liquid — wait until it's ready.
  function whenSwiperReady(cb) {
    if (window.Swiper) return cb();
    var tries = 0;
    var timer = setInterval(function () {
      if (window.Swiper) {
        clearInterval(timer);
        cb();
      } else if (++tries > 120) {
        clearInterval(timer); // give up after ~6s
      }
    }, 50);
  }

  function initPress(root) {
    var el = root.querySelector("[data-jv-press]");
    if (!el || el.swiper) return;

    var d = el.dataset;
    var perDesktop = parseFloat(d.perDesktop) || 6;
    var perTablet = parseFloat(d.perTablet) || 3;
    var perMobile = parseFloat(d.perMobile) || 1.3;
    var space = parseInt(d.space, 10) || 12;
    var loop = d.loop === "true";
    var arrows = d.arrows === "true";
    var dots = d.dots === "true";
    var autoplay = d.autoplay === "true";
    var speed = parseInt(d.autoplaySpeed, 10) || 4000;

    var slider = el.closest(".jv-press-slider");
    var nextEl = slider ? slider.querySelector(".jv-press-arrow--next") : null;
    var prevEl = slider ? slider.querySelector(".jv-press-arrow--prev") : null;
    var dotsEl = slider ? slider.querySelector(".jv-press-pagination") : null;

    new window.Swiper(el, {
      // Base = mobile: 1 full + a peek of the next, left-aligned.
      slidesPerView: perMobile,
      spaceBetween: space,
      grabCursor: true,
      loop: loop,
      centeredSlides: false,
      watchOverflow: true,
      speed: 500,
      autoplay: autoplay
        ? { delay: speed, disableOnInteraction: false }
        : false,
      navigation:
        arrows && nextEl && prevEl ? { nextEl: nextEl, prevEl: prevEl } : false,
      pagination: dots && dotsEl ? { el: dotsEl, clickable: true } : false,
      breakpoints: {
        // Tablet — exact integer count; edge peek comes from the CSS bleed margin.
        769: {
          slidesPerView: perTablet,
        },
        // Desktop — exact integer count; edge peek comes from the CSS bleed margin.
        1025: {
          slidesPerView: perDesktop,
        },
      },
    });
  }

  function destroyPress(root) {
    var el = root.querySelector("[data-jv-press]");
    if (el && el.swiper) el.swiper.destroy(true, true);
  }

  whenSwiperReady(function () {
    document.querySelectorAll(".jv-press-slider").forEach(function (s) {
      initPress(s);
    });

    // Shopify Theme Editor
    document.addEventListener("shopify:section:load", function (e) {
      whenSwiperReady(function () {
        initPress(e.target);
      });
    });
    document.addEventListener("shopify:section:unload", function (e) {
      destroyPress(e.target);
    });
  });
})();

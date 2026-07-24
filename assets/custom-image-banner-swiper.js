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

  function initBanner(el) {
    if (!el || el.swiper) return;

    var d = el.dataset;
    var perDesktop = parseFloat(d.perDesktop) || 5;
    var perTablet = parseFloat(d.perTablet) || 3;
    var perMobile = parseFloat(d.perMobile) || 1.3;
    var space = parseInt(d.space, 10) || 15;

    var pagination = el.parentNode
      ? el.parentNode.querySelector(".cib-swiper-pagination")
      : null;

    new window.Swiper(el, {
      // Base = mobile: 1 full + a peek of the next, left-aligned.
      slidesPerView: perMobile,
      spaceBetween: space,
      grabCursor: true,
      watchOverflow: true,
      speed: 500,
      pagination: pagination ? { el: pagination, clickable: true } : false,
      breakpoints: {
        // Tablet
        769: {
          slidesPerView: perTablet,
          spaceBetween: space,
        },
        // Desktop — show every item (matches the normal grid layout).
        1025: {
          slidesPerView: perDesktop,
          spaceBetween: space,
        },
      },
    });
  }

  function initRoot(root) {
    (root || document).querySelectorAll("[data-cib-swiper]").forEach(initBanner);
  }

  function destroyRoot(root) {
    (root || document).querySelectorAll("[data-cib-swiper]").forEach(function (el) {
      if (el.swiper) el.swiper.destroy(true, true);
    });
  }

  whenSwiperReady(function () {
    initRoot(document);

    // Shopify Theme Editor
    document.addEventListener("shopify:section:load", function (e) {
      whenSwiperReady(function () {
        initRoot(e.target);
      });
    });
    document.addEventListener("shopify:section:unload", function (e) {
      destroyRoot(e.target);
    });
  });
})();

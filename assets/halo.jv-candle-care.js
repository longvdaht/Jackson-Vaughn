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

  var MOBILE = "(max-width: 767px)";

  function initCare(root) {
    var el = root.querySelector("[data-jv-care]");
    if (!el) return;

    var d = el.dataset;
    var perMobile = parseFloat(d.perMobile) || 1.3;
    var space = parseInt(d.space, 10) || 16;

    function create() {
      if (el.swiper) return;
      new window.Swiper(el, {
        slidesPerView: perMobile,
        spaceBetween: space,
        grabCursor: true,
        watchOverflow: true,
        speed: 400,
      });
    }

    function destroy() {
      if (el.swiper) el.swiper.destroy(true, true);
    }

    // Only run the slider on mobile; on desktop the rows stack normally.
    var mq = window.matchMedia(MOBILE);
    function sync() {
      if (mq.matches) create();
      else destroy();
    }
    sync();
    if (mq.addEventListener) mq.addEventListener("change", sync);
    else mq.addListener(sync);
  }

  function destroyCare(root) {
    var el = root.querySelector("[data-jv-care]");
    if (el && el.swiper) el.swiper.destroy(true, true);
  }

  whenSwiperReady(function () {
    document.querySelectorAll(".jv-care").forEach(function (s) {
      initCare(s);
    });

    // Shopify Theme Editor
    document.addEventListener("shopify:section:load", function (e) {
      whenSwiperReady(function () {
        initCare(e.target);
      });
    });
    document.addEventListener("shopify:section:unload", function (e) {
      destroyCare(e.target);
    });
  });
})();

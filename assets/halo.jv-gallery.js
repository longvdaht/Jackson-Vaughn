(function ($) {
  var halo = {
    initGallerySlider: function (context) {
      var $sliders = context ? $(context).find('[data-jv-gallery-slider]') : $('[data-jv-gallery-slider]');

      $sliders.each(function () {
        var self = $(this);
        if (self.hasClass('slick-initialized')) return;

        var show = parseInt(self.data('show'), 10) || 5;
        var showTablet = parseInt(self.data('show-tablet'), 10) || 3;
        var center = self.data('center') === true;
        var arrows = self.data('arrows') !== false;
        var dots = self.data('dots') === true;
        var autoplay = self.data('autoplay') === true;
        var autoplaySpeed = parseInt(self.data('autoplay-speed'), 10) || 4000;

        self.slick({
          infinite: true,
          speed: 700,
          centerMode: center,
          centerPadding: center ? (self.data('center-padding') || '0px') : '0px',
          slidesToShow: show,
          slidesToScroll: 1,
          arrows: arrows,
          dots: dots,
          draggable: true,
          swipeToSlide: true,
          touchThreshold: 10,
          autoplay: autoplay,
          autoplaySpeed: autoplaySpeed,
          nextArrow: window.arrows ? window.arrows.icon_next : undefined,
          prevArrow: window.arrows ? window.arrows.icon_prev : undefined,
          rtl: window.rtl_slick || false,
          responsive: [
            {
              breakpoint: 1200,
              settings: {
                slidesToShow: showTablet,
                centerMode: center,
              },
            },
            {
              breakpoint: 768,
              settings: {
                // Fractional peek is driven by CSS width + variableWidth
                variableWidth: true,
                slidesToShow: 1,
                slidesToScroll: 1,
                centerMode: false,
                arrows: false,
              },
            },
          ],
        });
      });
    },

    unloadGallerySlider: function (context) {
      var $sliders = $(context).find('[data-jv-gallery-slider]');
      $sliders.each(function () {
        if ($(this).hasClass('slick-initialized')) {
          $(this).slick('unslick');
        }
      });
    },
  };

  $(document).ready(function () {
    halo.initGallerySlider();
  });

  // Shopify Theme Editor support
  document.addEventListener('shopify:section:load', function (e) {
    halo.initGallerySlider(e.target);
  });
  document.addEventListener('shopify:section:unload', function (e) {
    halo.unloadGallerySlider(e.target);
  });

  window.haloJvGallery = halo;
})(jQuery);

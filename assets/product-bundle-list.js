class BundleSlider extends HTMLElement {
  connectedCallback() {
    this.container = this.querySelector('.product-bundle__slider');
    this.prev = this.querySelector('[data-bundle-prev]');
    this.next = this.querySelector('[data-bundle-next]');

    if (!this.container) return;

    if (window.Swiper) {
      this.init();
    } else {
      // The theme may load Swiper lazily, so wait for it rather than failing silently.
      this.waitForSwiper();
    }
  }

  disconnectedCallback() {
    if (this.observer) this.observer.disconnect();
    if (this.swiper) this.swiper.destroy(true, true);
  }

  waitForSwiper() {
    let attempts = 0;
    const poll = setInterval(() => {
      attempts += 1;
      if (window.Swiper) {
        clearInterval(poll);
        this.init();
      } else if (attempts > 40) {
        clearInterval(poll);
      }
    }, 100);
  }

  init() {
    this.swiper = new window.Swiper(this.container, {
      slidesPerView: 'auto',
      spaceBetween: 8,
      freeMode: { enabled: true, sticky: false },
      watchOverflow: true,
      threshold: 5,
      navigation: {
        prevEl: this.prev,
        nextEl: this.next,
      },
      breakpoints: {
        990: { spaceBetween: 12 },
      },
      on: {
        init: (swiper) => this.toggleNav(swiper),
        resize: (swiper) => this.toggleNav(swiper),
      },
    });
  }

  toggleNav(swiper) {
    // `isLocked` is true when every slide already fits, so arrows would be dead controls.
    const locked = swiper.isLocked;
    [this.prev, this.next].forEach((button) => {
      if (button) button.hidden = locked;
    });
  }
}

if (!customElements.get('bundle-slider')) {
  customElements.define('bundle-slider', BundleSlider);
}
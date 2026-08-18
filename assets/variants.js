class VariantSelects extends HTMLElement {
    constructor() {
        super();
        this.item = $(this).closest('.productView');
        this.isFullWidth = this.item.closest('.product-full-width').length == 1 || this.item.closest('.product-full-width-2').length == 1;

        this.onVariantInit();
        this.addEventListener('change', this.onVariantChange.bind(this));
    }

    onVariantInit(){
        this.updateOptions();
        this.updateMasterId();
        this.updateMedia(1500, 'init');
        // this.updateURL();
        this.renderProductAjaxInfo();
        this.renderProductInfo();
        if (!this.currentVariant) {
            this.updateAttribute(true);
        } else {
            this.updateAttribute(false, !this.currentVariant.available);
        }
        this.updateVariantStatuses();
        this.updateShipsFree();
    }
    onVariantChange(event) {
        this.updateOptions();
        this.updateMasterId();
        this.updatePickupAvailability();
        this.updateVariantStatuses();
        this.updateShipsFree();
      
        if (!this.currentVariant) {
            this.updateAttribute(true);
            this.updateStickyAddToCart(true);
        } else {
            this.updateMedia(200, 'change');
            if (!document.querySelector('.featured-product')) {
                this.updateURL();
            }
            this.updateVariantInput();
            this.renderProductAjaxInfo();
            this.renderProductInfo();
            this.updateProductInfo();
            this.updateAttribute(false, !this.currentVariant.available);
            this.updateStickyAddToCart(false, !this.currentVariant.available);
            this.checkQuantityWhenVariantChange();
        }
    }

    updateOptions() {
        this.options = Array.from(this.querySelectorAll('select'), (select) => select.value);
    }

    // Toggle the "Ships Free" label above each Bundle option value based on the
    // price of (that value × the other currently-selected options) vs threshold.
    updateShipsFree() {
        const fieldset = this.querySelector('[data-ships-free-option]');
        if (!fieldset) return;

        const threshold = parseInt(fieldset.getAttribute('data-ships-free-threshold'), 10) || 8000;
        const optionIndex = parseInt(fieldset.getAttribute('data-option-index'), 10);
        if (Number.isNaN(optionIndex)) return;

        const variants = this.getVariantData();
        if (!variants || !variants.length) return;

        // The currently selected option values (radio inputs), by option index.
        const selected = [];
        this.querySelectorAll('fieldset[data-option-index]').forEach((fs) => {
            const idx = parseInt(fs.getAttribute('data-option-index'), 10);
            const checked = fs.querySelector('input[type="radio"]:checked');
            if (!Number.isNaN(idx) && checked) selected[idx] = checked.value;
        });

        fieldset.querySelectorAll('[data-ships-free-label]').forEach((labelEl) => {
            const value = labelEl.getAttribute('data-option-value');

            // Find the variant whose bundle-option value == this value AND whose
            // other options match the current selection.
            const match = variants.find((v) => {
                if (v.options[optionIndex] !== value) return false;
                for (let i = 0; i < v.options.length; i++) {
                    if (i === optionIndex) continue;
                    if (selected[i] != null && v.options[i] !== selected[i]) return false;
                }
                return true;
            });

            const free = match && typeof match.price === 'number' && match.price > threshold;
            labelEl.hidden = !free;
        });
    }


    decodeOptions() {
        this.options = this.options.map(option => {
            const parsedOption = this.decodeOption(option)
            return parsedOption
        })
    }
  
    decodeOption(option) {
      if (option) {
          return option.split('Special_Double_Quote').join('"').split('Special_Slash').join('/')
        } else {
          return null
        }
    }

    encodeOption(option) {
        if (option) {
          return option.split('"').join('Special_Double_Quote').split('/').join('Special_Slash')
        } else {
          return null
        }
    }
    
    updateMasterId() {
        this.decodeOptions()
        this.currentVariant = this.getVariantData().find((variant) => {
            return !variant.options.map((option, index) => {
                return this.options[index] === option;
            }).includes(false);
        });

        if (this.item.find('[data-filter]').length && this.currentVariant?.featured_media && this.currentVariant.featured_media.alt != null) {
            this.item.find('[data-filter]:checked').attr('data-value-default-lang', this.currentVariant?.featured_media.alt.toLowerCase().replace(/ /g,"-"));
        }
    }      

    updateMedia(time, status) {
        const enableVariantImageGroup = document?.querySelector('.enable_variant_image_group');
    
        if (enableVariantImageGroup && status == 'init') return;

        setTimeout(() => {
            if (!this.currentVariant || !this.currentVariant?.featured_media || document.querySelector('.productView-nav')?.matches('.media-filter')) return;
            
            const targetMediaId = this.currentVariant.featured_media.id;

            // Swiper (replacing the old Slick markup): drive the main gallery via
            // swiper.slideTo() instead of triggering a click on the thumbnail.
            // Main slider slides carry the media id on .product-single__media
            // (unprefixed), while thumbnails use "${section}-${id}".
            const productScope = this.item && this.item[0] ? this.item[0] : document;
            const mainSlider = productScope.querySelector('.main-slider');
            const mainSwiper = mainSlider?.swiper;

            if (mainSwiper && targetMediaId) {
                const slides = Array.from(mainSlider.querySelectorAll('.swiper-slide'));
                const targetIndex = slides.findIndex((slide) =>
                    slide.querySelector(`[data-media-id="${targetMediaId}"]`)
                );
                if (targetIndex >= 0) {
                    window.setTimeout(() => {
                        // loop mode needs slideToLoop; fall back to slideTo otherwise
                        if (typeof mainSwiper.slideToLoop === 'function' && mainSwiper.params?.loop) {
                            mainSwiper.slideToLoop(targetIndex);
                        } else {
                            mainSwiper.slideTo(targetIndex);
                        }
                    }, time);
                }
            } else {
                // Fallback to the legacy behaviour if Swiper isn't present.
                const newMedia = document.querySelectorAll(
                    `[data-media-id="${this.dataset.section}-${targetMediaId}"]`
                );
                if (newMedia.length) {
                    window.setTimeout(() => { $(newMedia).trigger('click'); }, time);
                }
            }
    
            // Desktop stacked gallery (not full-width): images live in an internal
            // scroll container (.halo-productView-left) whose overflow-y is hidden
            // by default (only scrollable on :hover). To auto-scroll on variant
            // change we briefly force overflow-y:auto inline (inline wins over the
            // stylesheet), scroll, then remove the inline style to restore the
            // hover-only behaviour.
            if (window.innerWidth >= 768 && !this.isFullWidth) {
                var stackMediaId = this.currentVariant.featured_media.id;
                var mediaEl = productScope.querySelector(`.product-single__media[data-media-id="${stackMediaId}"]`);
                var block = mediaEl ? (mediaEl.closest('.swiper-slide') || mediaEl.closest('.productView-image') || mediaEl) : null;
                if (block) {
                    var scrollContainer = block.closest('.halo-productView-left') || block.closest('[data-image-gallery]');
                    window.setTimeout(() => {
                        if (scrollContainer) {
                            var prevOverflow = scrollContainer.style.overflowY;
                            scrollContainer.style.overflowY = 'auto';          // temporarily enable
                            var top = block.offsetTop - scrollContainer.offsetTop;
                            scrollContainer.scrollTo({ top: top, behavior: 'smooth' });
                            // Restore the hover-only overflow after the smooth scroll finishes.
                            window.setTimeout(() => {
                                scrollContainer.style.overflowY = prevOverflow || '';
                            }, 600);
                        } else {
                            block.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                    }, 30);
                }
                return;
            }

            if (!this.isFullWidth || window.innerWidth < 768 || !this.currentVariant) return;
            const mediaId = this.currentVariant.featured_media.id;
            const mediaToReplace = document?.querySelector('.productView-image[data-index="1"]');
            if (mediaId) {
                const activeThumbnail = document?.querySelector(`.product-single__media[data-media-id="${mediaId}"]`).parentElement;
                activeThumbnail.parentElement.prepend(activeThumbnail);
                setTimeout(() => {this.scrollToBlock(mediaToReplace)}, 20);
            } else {
                const imageToReplace = mediaToReplace?.querySelector('img');
                const image = this.currentVariant?.featured_image;
                if (image == null) return;
                imageToReplace?.setAttribute('src',  image.src)
                imageToReplace?.setAttribute('srcset', image.src)
                imageToReplace?.setAttribute('alt', image.alt)
                if (mediaToReplace?.getBoundingClientRect().top < window.scrollY) this.scrollToBlock(mediaToReplace);
            }
        }, 1)
    }

    scrollToBlock(block) {
        const headerHeight = document.querySelectorAll('.section-header-navigation')[0]?.getBoundingClientRect().height 
        const announcementBarHeight = document.querySelectorAll('.announcement-bar')[0]?.getBoundingClientRect().height 
        const positionTop = block.getBoundingClientRect().top - headerHeight - announcementBarHeight 

        window.scrollTo({
            top: positionTop,
            behavior: 'smooth'
        })
    }

    updateURL() {
        if (!this.currentVariant) return;
        window.history.replaceState({ }, '', `${this.dataset.url}?variant=${this.currentVariant.id}`);
    }

    updateVariantInput() {
        const productForms = document.querySelectorAll(`#product-form-${this.dataset.product}, #product-form-installment-${this.dataset.product}`);

        productForms.forEach((productForm) => {
            const input = productForm.querySelector('input[name="id"]');
            input.value = this.currentVariant.id;
            input.dispatchEvent(new Event('change', { bubbles: true }));
        });
    }

    updatePickupAvailability() {
        const pickUpAvailability = document.querySelector('pickup-availability');
        if (!pickUpAvailability) return;

        if (this.currentVariant?.available) {
            pickUpAvailability.fetchAvailability(this.currentVariant.id);
        } else {
            pickUpAvailability.removeAttribute('available');
            pickUpAvailability.innerHTML = '';
        }
    }

    renderProductAjaxInfo() {
        fetch(`${this.dataset.url}?variant=${this.currentVariant.id}&section_id=${this.dataset.section}`)
            .then((response) => response.text())
            .then((responseText) => {
                const html = new DOMParser().parseFromString(responseText, 'text/html')

                this.updateContentById('product-price-', html);
                this.updateContentById('product-property-', html);
                this.updateContentById('product-badges-', html);
                this.updateContentById('product-badges-info-', html);

                if (this.checkNeedToConvertCurrency()) {
                    let currencyCode = document.getElementById('currencies')?.querySelector('.active')?.getAttribute('data-currency');

                    Currency.convertAll(window.shop_currency, currencyCode, 'span.money', 'money_format');
                }

                document.getElementById(`product-price-${this.dataset.product}`)?.classList.remove('visibility-hidden');
                //this.updateBadgeSale()
        });
    }

    updateContentById(idPrefix, html) {
        const id = `${idPrefix}${this.dataset.product}`;
        const destination = document.getElementById(id);
        const source = html.getElementById(id);

        if (source && destination && idPrefix !== 'product-property-') {
            destination.innerHTML = source.innerHTML;
        }

        if (idPrefix === 'product-property-') {
            if (destination) {
                if (source) {
                    destination.innerHTML = source.innerHTML;
                    destination.style.display = 'table';
                } else{
                    destination.style.display = 'none';
                }
            } else if (source) {
                document.querySelector('.productView-product').insertBefore(source, document.querySelector('.productView-options'));
            }
        }
    }

    renderProductInfo() {
        if(this.item.find('[data-sku]').length > 0){
            this.item.find('[data-sku] .productView-info-value').text(this.currentVariant.sku);
        }

        if(this.item.find('[data-barcode]').length > 0){
            this.item.find('[data-barcode] .productView-info-value').text(this.currentVariant.barcode);
        }

        var inventory = this.currentVariant?.inventory_management;

        if(inventory != null) {
            var arrayInVarName = `product_inven_array_${this.dataset.product}`,
                inven_array = window[arrayInVarName];

            if(inven_array != undefined) {
                var inven_num = inven_array[this.currentVariant.id],
                    inputQuantity = this.item.find('input[name="quantity"]'),
                    buttonSubmit = this.item.find('button#product-add-to-cart'),
                    inventoryQuantity = parseInt(inven_num);

                if(inputQuantity.length > 0) {
                    inputQuantity.attr('data-inventory-quantity', inventoryQuantity);
                } else {
                    buttonSubmit.attr('data-inventory-quantity', inventoryQuantity);
                }

                if(this.item.find('[data-inventory]').length > 0){
                    if(inventoryQuantity > 0){
                        const showStock = this.item.find('[data-inventory]').data('stock-level');
                        if (showStock == 'show') {
                            this.item.find('[data-inventory] .productView-info-value').text(inventoryQuantity+' '+window.inventory_text.inStock);
                        }
                        else {
                            this.item.find('[data-inventory] .productView-info-value').text(window.inventory_text.inStock);
                        }
                    } else {
                        this.item.find('[data-inventory] .productView-info-value').text(window.inventory_text.outOfStock);
                    }
                }

                hotStock(inventoryQuantity);
            }
        }

        if(this.item.find('.productView-stickyCart').length > 0){
            const sticky = this.item.find('.productView-stickyCart');
            const optionSticky = sticky.find('.select__select');

            optionSticky.val(this.currentVariant.id);
        }
    }

    updateProductInfo() {
        fetch(`${this.dataset.url}?variant=${this.currentVariant.id}&section_id=${this.dataset.section}`)
            .then((response) => response.text())
            .then((responseText) => {
                const description = `[data-product-description-${this.dataset.product}]`
                const html = new DOMParser().parseFromString(responseText, 'text/html')
                const destinationDesc = document.querySelector(description);
                const sourceDesc = html.querySelector(description);

                if (sourceDesc && destinationDesc) {
                    destinationDesc.innerHTML = sourceDesc.innerHTML;
                    if (destinationDesc.closest('.toggle-content--height')){
                        destinationDesc.style.maxHeight = null;
                    }
                }
        });
    }

    updateAttribute(unavailable = true, disable = true){
        const addButton = document.getElementById(`product-form-${this.dataset.product}`)?.querySelector('[name="add"]');
        var quantityInput = this.item.find('.quantity__group--1 input[name="quantity"]').filter(':visible').first();
        if (quantityInput.length === 0) quantityInput = this.item.find('.quantity__group--1 input[name="quantity"]').first();
        if (quantityInput.length === 0) quantityInput = this.item.find('input[name="quantity"]').first();
        var notifyMe = this.item.find('.productView-notifyMe'),
            hotStock = this.item.find('.productView-hotStock'),
            buttonAddtocart = this.item.find('.product-form__submit'),
            maxValue = parseInt(quantityInput.attr('data-inventory-quantity'));

        if (isNaN(maxValue)) {
            maxValue = parseInt(buttonAddtocart.attr('data-inventory-quantity'));
        } else {
            maxValue = parseInt(quantityInput.attr('data-inventory-quantity'));
        }
        
        if(unavailable){
            var text = window.variantStrings.unavailable;

            quantityInput.attr('disabled', true);
            notifyMe.slideUp('slow');
            if (addButton != null){
                addButton.setAttribute('disabled', true);
                addButton.textContent = text;
            }
            quantityInput.closest('quantity-input').addClass('disabled');

            if(hotStock.length > 0) hotStock.addClass('is-hiden');
        } else {
            if (disable) {
                var text = window.variantStrings.soldOut,
                    subTotal = 0,
                    price = this.currentVariant?.price;

                const stickyPrice = $('[data-sticky-add-to-cart] .money-subtotal .money');
                const stickyComparePrice = $('[data-sticky-add-to-cart] .money-compare-price .money');

                if (window.subtotal.show) {
                    let qty = quantityInput.val() || 1;

                    subTotal = qty * price;
                    subTotal = Shopify.formatMoney(subTotal, window.money_format);
                    subTotal = extractContent(subTotal);

                    const moneySpan = document.createElement('span')
                    moneySpan.classList.add(window.currencyFormatted ? 'money' : 'money-subtotal')
                    moneySpan.innerText = subTotal
                    document.body.appendChild(moneySpan)

                    if (this.checkNeedToConvertCurrency()) {
                        let currencyCode = document.getElementById('currencies')?.querySelector('.active')?.getAttribute('data-currency');
                        Currency.convertAll(window.shop_currency, currencyCode, 'span.money', 'money_format');
                    }

                    subTotal = moneySpan.innerText
                    $(moneySpan).remove()

                    if (window.subtotal.style == '1') {
                        const pdView_subTotal = document.querySelector('.productView-subtotal .money') || document.querySelector('.productView-subtotal .money-subtotal');
                        if (pdView_subTotal != null) {
                            pdView_subTotal.textContent = subTotal;
                        }
                    } else if (window.subtotal.style == '2') {
                        text = window.subtotal.text.replace('[value]', subTotal);
                    }
                } else {
                    subTotal = Shopify.formatMoney(price, window.money_format);
                    subTotal = extractContent(subTotal);
                }

                quantityInput.attr('data-price', this.currentVariant?.price);
                quantityInput.attr('data-compare-price', this.currentVariant?.compare_at_price || '');
                quantityInput.attr('disabled', true);
                if (addButton != null){
                    addButton.setAttribute('disabled', true);
                    addButton.textContent = text;
                }
                quantityInput.closest('quantity-input').addClass('disabled');

                if (subTotal != 0 && stickyPrice.length) {
                    stickyPrice.text(subTotal);
                }

                const thisStickyPrice = $('[data-sticky-add-to-cart] .sticky-price');
                const thisComparePrice = $('[data-sticky-add-to-cart] .money-compare-price');
                const compare_at_price = this.currentVariant?.compare_at_price;
                const current_at_price = this.currentVariant?.price;

                if(compare_at_price == current_at_price) {
                    thisStickyPrice.removeClass('has-compare-price');
                    thisComparePrice.remove();
                } else {
                    if (compare_at_price) {
                        thisStickyPrice.addClass('has-compare-price');
                        if (thisComparePrice.length) {
                            thisComparePrice.attr('data-compare-price', compare_at_price);
                        } else {
                            thisStickyPrice.prepend(`<s class="money-compare-price" data-compare-price="${compare_at_price}"><span class="money"></span></s>`);
                        }
                    } else {
                        thisStickyPrice.removeClass('has-compare-price');
                        thisComparePrice.remove();
                    }
                }

                if (subTotal != 0 && stickyComparePrice.length && window.subtotal.show) {
                    let comparePrice = $('[data-sticky-add-to-cart] .money-compare-price').data('compare-price'),
                        qty = quantityInput.val() || 1;
                    comparePrice = qty * comparePrice;
                    comparePrice = Shopify.formatMoney(comparePrice, window.money_format);
                    comparePrice = extractContent(comparePrice);
                    stickyComparePrice.text(comparePrice);
                }

                if (notifyMe.length > 0) {
                    notifyMe.find('.halo-notify-product-variant').val(this.currentVariant.title);
                    notifyMe.find('.notifyMe-text').empty();
                    notifyMe.slideDown('slow');
                }
            } else {
                var text,
                    buttonHTML = null,
                    subTotal = 0,
                    price = this.currentVariant?.price;

                const stickyPrice = $('[data-sticky-add-to-cart] .money-subtotal .money');

                if (window.subtotal.show) {
                    let qty = quantityInput.val() || 1;

                    subTotal = qty * price;
                    subTotal = Shopify.formatMoney(subTotal, window.money_format);
                    subTotal = extractContent(subTotal);

                    const moneySpan = document.createElement('span')
                    moneySpan.classList.add(window.currencyFormatted ? 'money' : 'money-subtotal')
                    moneySpan.innerText = subTotal
                    document.body.appendChild(moneySpan)

                    if (this.checkNeedToConvertCurrency()) {
                        let currencyCode = document.getElementById('currencies')?.querySelector('.active')?.getAttribute('data-currency');
                        Currency.convertAll(window.shop_currency, currencyCode, 'span.money', 'money_format');
                    }

                    subTotal = moneySpan.innerText
                    $(moneySpan).remove()

                    if (window.subtotal.style == '1') {
                        const pdView_subTotal = document.querySelector('.productView-subtotal .money') || document.querySelector('.productView-subtotal .money-subtotal');
                        if (pdView_subTotal != null) {
                            pdView_subTotal.textContent = subTotal;
                        }

                        if (this.currentVariant.available && maxValue <= 0 && this.currentVariant.inventory_management == "shopify" && this.currentVariant.inventory_policy != 'continue') {
                            text = window.variantStrings.preOrder;
                        } else {
                            text = window.variantStrings.addToCart;
                        }
                    } else if (window.subtotal.style == '2') {
                        if (this.currentVariant.available && maxValue <= 0 && this.currentVariant.inventory_management == "shopify" && this.currentVariant.inventory_policy != 'continue') {
                            text = window.variantStrings.preOrder;
                        } else {
                            text = window.subtotal.text.replace('[value]', subTotal);
                            $('#show-sticky-product').text(text);
                            $('#product-sticky-add-to-cart').text(text);

                            // Compare-at subtotal on the ATC button (qty * compare_at_price)
                            let qtyForCompare = quantityInput.val() || 1;
                            let cmp = this.currentVariant?.compare_at_price;
                            if (cmp && cmp > price) {
                                let cmpTotal = Shopify.formatMoney(qtyForCompare * cmp, window.money_format);
                                cmpTotal = extractContent(cmpTotal);
                                buttonHTML = window.subtotal.text.replace(
                                    '[value]',
                                    '<s class="atc-compare-price">' + cmpTotal + '</s> <span class="atc-current-price">' + subTotal + '</span>'
                                );
                            }
                        }
                    }
                } else {
                    subTotal = Shopify.formatMoney(price, window.money_format);
                    subTotal = extractContent(subTotal);
                    if (this.currentVariant.available && maxValue <= 0 && this.currentVariant.inventory_management == "shopify" && this.currentVariant.inventory_policy != 'continue') {
                        text = window.variantStrings.preOrder;
                    } else {
                        text = window.variantStrings.addToCart;
                    }
                }

                quantityInput.attr('data-price', this.currentVariant?.price);
                quantityInput.attr('data-compare-price', this.currentVariant?.compare_at_price || '');
                quantityInput.attr('disabled', false);
                if (addButton != null){
                    addButton.removeAttribute('disabled');
                    if (buttonHTML) {
                        addButton.innerHTML = buttonHTML;
                    } else {
                        addButton.textContent = text;
                    }
                }
                quantityInput.closest('quantity-input').removeClass('disabled');

                if (subTotal != 0 && stickyPrice.length) {
                    stickyPrice.text(subTotal);
                }

                const thisStickyPrice = $('[data-sticky-add-to-cart] .sticky-price');
                const thisComparePrice = $('[data-sticky-add-to-cart] .money-compare-price');
                const compare_at_price = this.currentVariant?.compare_at_price;
                const current_at_price = this.currentVariant?.price;

                if(compare_at_price == current_at_price) {
                    thisStickyPrice.removeClass('has-compare-price');
                    thisComparePrice.remove();
                } else {
                    if (compare_at_price) {
                        thisStickyPrice.addClass('has-compare-price');
                        if (thisComparePrice.length) {
                            thisComparePrice.attr('data-compare-price', compare_at_price);
                            
                            const compare_at_price_sticky = Shopify.formatMoney(compare_at_price, window.money_format);
                            const comparePrice_sticky = extractContent(compare_at_price_sticky);
                            thisComparePrice.text(comparePrice_sticky);
                            
                            if (this.checkNeedToConvertCurrency()) {
                                let currencyCode = document.getElementById('currencies')?.querySelector('.active')?.getAttribute('data-currency');
                                Currency.convertAll(window.shop_currency, currencyCode, 'span.money', 'money_format');
                            }

                            thisStickyPrice.prepend(`<s class="money-compare-price" data-compare-price="${compare_at_price}"><span class="money"></span></s>`);
                            thisComparePrice.remove();
                        } else {
                            thisStickyPrice.prepend(`<s class="money-compare-price" data-compare-price="${compare_at_price}"><span class="money"></span></s>`);
                        }
                    } else {
                        thisStickyPrice.removeClass('has-compare-price');
                        thisComparePrice.remove();
                    }
                }

                const stickyComparePrice = $('[data-sticky-add-to-cart] .money-compare-price .money');
                if (subTotal != 0 && stickyComparePrice.length && window.subtotal.show) {
                    let comparePrice = $('[data-sticky-add-to-cart] .money-compare-price').data('compare-price'),
                        qty = quantityInput.val() || 1;
                    comparePrice = qty * comparePrice;
                    comparePrice = Shopify.formatMoney(comparePrice, window.money_format);
                    comparePrice = extractContent(comparePrice);
                    stickyComparePrice.text(comparePrice);
                }

                if (notifyMe.length > 0) {
                    notifyMe.slideUp('slow');
                }
            }
        }
    }

    updateStickyAddToCart(unavailable = true, disable = true){
        if(this.item.find('.productView-stickyCart').length > 0){
            const sticky = this.item.find('.productView-stickyCart');
            const itemImage = sticky.find('.sticky-image');
            const option = sticky.find('.select__select');
            const input = document.getElementById(`product-form-sticky-${this.dataset.product}`)?.querySelector('input[name="id"]');
            const button = document.getElementById(`product-form-sticky-${this.dataset.product}`)?.querySelector('[name="add"]');
            var quantityInput = this.item.find('input[name="quantity"]');
            var submitBtn = $('.product-form__submit');
            var maxValue;

            if (quantityInput.length > 0) {
                maxValue = parseInt(quantityInput.attr('data-inventory-quantity'));
            } else {
                maxValue = parseInt(submitBtn.attr('data-inventory-quantity'));
            }
          
            if(unavailable){
                var text = window.variantStrings.unavailable;

                button.setAttribute('disabled', true);
                button.textContent = text;
            } else {
                if (!this.currentVariant) return;

                const image = this.currentVariant?.featured_image;
                
                if (image != null) {
                    itemImage.find('img').attr({
                        'src': image.src,
                        'srcset': image.src,
                        'alt': image.alt
                    });
                }

                option.val(this.currentVariant.id);

                if (disable) {
                    var text = window.variantStrings.soldOut;

                    button.setAttribute('disabled', true);
                    button.textContent = text;
                } else {
                    if (this.currentVariant.available && maxValue <= 0 && this.currentVariant.inventory_management == "shopify" && this.currentVariant.inventory_policy != 'continue') {
                        text = window.variantStrings.preOrder;
                    } else {
                        text = window.variantStrings.addToCart;
                    }

                    button.removeAttribute('disabled');
                    button.textContent = text;
                }

                input.value = this.currentVariant.id;
                input.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
    }

    getVariantData() {
        this.variantData = this.variantData || JSON.parse(this.querySelector('[type="application/json"]').textContent);
        return this.variantData;
    }

    checkNeedToConvertCurrency() {
        var currencyItem = $('.dropdown-item[data-currency]');
        if (currencyItem.length) {
            return (window.show_multiple_currencies && Currency.currentCurrency != shopCurrency) || window.show_auto_currency;
        } else {
            return;
        }
    }

    checkQuantityWhenVariantChange() {
        var quantityInput = this.closest('.productView-details').querySelector('input.quantity__input')
        var maxValue = parseInt(quantityInput?.dataset.inventoryQuantity);
        var inputValue = parseInt(quantityInput?.value);

        let value = inputValue 

        if (inputValue > maxValue && maxValue > 0) {
            value = maxValue
        } else {
            value = inputValue
        }

        if (value < 1 || isNaN(value)) value = 1 
      
        if (quantityInput) {
          quantityInput.value = value
        }
      
        // document.getElementById('product-add-to-cart').dataset.available = this.currentVariant.available && maxValue <= 0
        const elementProductAddToCart = document.getElementById('product-add-to-cart');
        if (elementProductAddToCart && this.currentVariant?.available !== undefined && typeof maxValue !== 'undefined') {
            elementProductAddToCart.dataset.available = this.currentVariant.available && maxValue <= 0;
        }
    }

    updateVariantStatuses() {
        // const options = this.item.find('.productView-details .product-form__input'),
        //     optionsLength = options.length,
        //     pvOptionsLength = PVoptions.length,
        //     checkStickyVariant = false;
      
        // optionsLength > pvOptionsLength ? checkStickyVariant = true : '';

        const selectedOptionOneVariants = this.variantData.filter(variant => this.querySelector(':checked').value === variant.option1);
        const inputWrappers = [...this.querySelectorAll('.product-form__input')];
        const inputLength = inputWrappers.length;
        const variant_swatch = [...this.querySelectorAll('.product-form__swatch')];
        inputWrappers.forEach((option, index) => {
            option.querySelector('[data-header-option]').innerText = option.querySelector(':checked').value;
            const checkedOption = option.querySelector(':checked');
            if (checkedOption) {
                var burnEl = option.querySelector('.data-burn-hours');
                if (burnEl) burnEl.innerText = checkedOption.dataset.burnTime;
            }
            if (index === 0 && inputLength > 1) return;
            const optionInputs = [...option.querySelectorAll('input[type="radio"], option')]
            const previousOptionSelected = inputLength > 1 ? inputWrappers[index - 1].querySelector(':checked').value : inputWrappers[index].querySelector(':checked').value;
            const optionInputsValue = inputLength > 1 ? selectedOptionOneVariants.filter(variant => variant[`option${ index }`] === previousOptionSelected).map(variantOption => variantOption[`option${ index + 1 }`]) : this.variantData.map(variantOption => variantOption[`option${ index + 1 }`]);
            const availableOptionInputsValue = inputLength > 1 ? selectedOptionOneVariants.filter(variant => variant.available && variant[`option${ index }`] === previousOptionSelected).map(variantOption => variantOption[`option${ index + 1 }`]) : this.variantData.filter(variant => variant.available).map(variantOption => variantOption[`option${ index + 1 }`]);
            this.setInputAvailability(optionInputs, optionInputsValue, availableOptionInputsValue)
            if (variant_swatch.length > 1){
                this.updateImageSwatch(selectedOptionOneVariants)
            }
        });
    }

    updateImageSwatch(selectedOptionOneVariants) {
        const inputWrappers = this.querySelectorAll('.product-form__input');
        if(inputWrappers){
            inputWrappers.forEach((element, inputIndex) => {
                const imageSpan = element.querySelectorAll("label>span.pattern");
                const imageLabel = element.querySelectorAll("label");
                const imageSpanImage = element.querySelectorAll("label>span.expand>img");
                const inputList = element.querySelectorAll("input");

                inputList.forEach((item, index) => {
                    const image = selectedOptionOneVariants.filter(tmp => {
                        if (inputIndex == 0) return tmp.option1 == item.value;
                        if (inputIndex == 1) return tmp.option2 == item.value;
                        if (inputIndex == 2) return tmp.option3 == item.value;
                    });
    
                    if(image.length > 0) {
                        imageLabel[index].style.display = "inline-block";
                        if (imageSpan[index] != undefined && image[0].featured_image != null) imageSpan[index].style.backgroundImage = `url("${image[0].featured_image.src}")`;
                        if (imageSpanImage[index] != undefined && image[0].featured_image != null) imageSpanImage[index].srcset = image[0].featured_image.src;
                    }
                    // else {
                    //     imageLabel[index].style.display = "none";
                    // }
                })
            });
        }
    }            

    setInputAvailability(optionInputs, optionInputsValue, availableOptionInputsValue) {
        optionInputs.forEach(input => {
            if (availableOptionInputsValue.includes(input.getAttribute('value'))) {
                input.classList.remove('soldout');
                input.innerText = input.getAttribute('value');
            } else {
                input.classList.add('soldout');
                optionInputsValue.includes(input.getAttribute('value')) ? input.innerText = input.getAttribute('value') + ' (Sold out)' : input.innerText = window.variantStrings.unavailable_with_option.replace('[value]', input.getAttribute('value'))
            }
        });
    }

    updateBadgeSale() {
        let badgeWrap = document.querySelector(".productView-badge"),
            badgeText = badgeWrap.querySelector(".productView-badge .badge.sale-badge"),
            badgeTextSaleType = badgeWrap.getAttribute('data-text-sale-badge'),
            priceCompare = document.querySelector(".productView-product .price__compare").getAttribute('data-compare'),
            priceLast = document.querySelector(".productView-product .price__sale .price__last").getAttribute('data-last'),
            percentSale = Math.round(((priceCompare - priceLast) / priceCompare) * 100);

        function renderSpan(text1, text2) {
            let spanElement = document.createElement('span');
            spanElement.classList.add('badge', 'sale-badge');
            let container = document.querySelector('.productView-badge');
            container.appendChild(spanElement);
            spanElement.innerText = `${text1} ${text2}%`
        }

        if (badgeWrap.classList.contains("has-badge-js")) {
            if (!priceCompare) {
                badgeWrap.querySelector(".badge.sale-badge")?.remove();
            } else {
                if (!badgeText) {
                    renderSpan(badgeTextSaleType, percentSale)
                } else {
                    badgeText.innerText = `${badgeTextSaleType} ${percentSale}%`
                }
            }
        } else {
            if (!priceCompare) {
                badgeWrap.querySelector(".badge.sale-badge")?.remove();
            } else {
                if (!badgeText) {
                    renderSpan(badgeTextSaleType, percentSale);
                } else {
                    badgeText.innerText = `${badgeTextSaleType}`
                }
            }
        }

    }
}

customElements.define('variant-selects', VariantSelects);

class VariantRadios extends VariantSelects {
    constructor() {
        super();
    }

    setInputAvailability(optionInputs, optionInputsValue, availableOptionInputsValue) {
        optionInputs.forEach(input => {
            if (availableOptionInputsValue.includes(input.getAttribute('value'))) {
                input.nextSibling.classList.remove('soldout', 'unavailable');
                input.nextSibling.classList.add('available');
            } else {
                input.nextSibling.classList.remove('available', 'unavailable');
                input.nextSibling.classList.add('soldout');

                if (window.variantStrings.hide_variants_unavailable && !optionInputsValue.includes(input.getAttribute('value'))) {
                    input.nextSibling.classList.add('unavailable')
                    if (!input.checked) return;
                    let inputsValue;
                    availableOptionInputsValue.length > 0 ? inputsValue = availableOptionInputsValue : inputsValue = optionInputsValue;
                    input.closest('.product-form__input').querySelector(`input[value="${inputsValue[0]}"]`).checked = true;
                    this.dispatchEvent(new Event('change'))
                }
            }
        });
    }
        
    updateOptions() {
        const fieldsets = Array.from(this.querySelectorAll('fieldset'));
        this.options = fieldsets.map((fieldset) => {
            return Array.from(fieldset.querySelectorAll('input')).find((radio) => radio.checked).value;
        });
    }
}

customElements.define('variant-radios', VariantRadios);

class QuantityInput extends HTMLElement {
    constructor() {
        super();
        if (this.closest('.quick-order-list__contents')) return; 
        this.input = this.querySelector('input');
        this.changeEvent = new Event('change', { bubbles: true });
        this.input.addEventListener('change', this.onInputChange.bind(this));

        this.querySelectorAll('button').forEach(
            (button) => button.addEventListener('click', this.onButtonClick.bind(this))
        );

        if (!this.checkHasMultipleVariants()) {
            this.initProductQuantity();
            this.checkVariantInventory();
        }
    }

    onInputChange(event) {
        event.preventDefault(); 
        var inputValue = this.input.value;
        var maxValue = parseInt(this.input.dataset.inventoryQuantity);
        var currentId = document.getElementById(`product-form-${this.input.dataset.product}`)?.querySelector('[name="id"]')?.value;
        var saleOutStock  = document.getElementById('product-add-to-cart')?.dataset.available === 'true' || false ;
        const addButton = document.getElementById(`product-form-${this.input.dataset.product}`)?.querySelector('[name="add"]');

        if(inputValue < 1) {
            inputValue = 1;

            this.input.value =  inputValue;
        }
        
        if (inputValue > maxValue && !saleOutStock && maxValue > 0) {
            var arrayInVarName = `selling_array_${this.input.dataset.product}`,
                itemInArray = window[arrayInVarName],
                itemStatus = itemInArray[currentId];
          
            if(itemStatus == 'deny') {
              inputValue = maxValue
              this.input.value = inputValue;
              const message = getInputMessage(maxValue)
              showWarning(message, 3000)
            }
        } else if (inputValue > maxValue && saleOutStock && maxValue <= 0) {
            this.input.value = inputValue;
        }

        if(window.subtotal.show) {
            var text,
                price = this.input.dataset.price,
                subTotal = 0;

            var parser = new DOMParser();

            subTotal = inputValue * price;
            subTotal = Shopify.formatMoney(subTotal, window.money_format);
            subTotal = extractContent(subTotal);

            const moneySpan = document.createElement('span')
            moneySpan.classList.add(window.currencyFormatted ? 'money' : 'money-subtotal') 
            moneySpan.innerText = subTotal 
            document.body.appendChild(moneySpan) 

            if (this.checkNeedToConvertCurrency()) {
                let currencyCode = document.getElementById('currencies')?.querySelector('.active')?.getAttribute('data-currency');
                Currency.convertAll(window.shop_currency, currencyCode, 'span.money', 'money_format');
            }

            subTotal = moneySpan.innerText 
            $(moneySpan).remove()

            if (window.subtotal.style == '1') {
                const pdView_subTotal = document.querySelector('.productView-subtotal .money') || document.querySelector('.productView-subtotal .money-subtotal');

                pdView_subTotal.textContent = subTotal;
            }
            else if (window.subtotal.style == '2') {
                text = window.subtotal.text.replace('[value]', subTotal);
                $('#product-sticky-add-to-cart').text(text);
                if (addButton != null){
                    // Compare-at subtotal on the ATC button (qty * compare_at_price)
                    let cmp = parseFloat(this.input.dataset.comparePrice);
                    if (cmp && cmp > price) {
                        let cmpTotal = Shopify.formatMoney(inputValue * cmp, window.money_format);
                        cmpTotal = extractContent(cmpTotal);
                        addButton.innerHTML = window.subtotal.text.replace(
                            '[value]',
                            '<s class="atc-compare-price">' + cmpTotal + '</s> <span class="atc-current-price">' + subTotal + '</span>'
                        );
                    } else {
                        addButton.textContent = text;
                    }
                }
            }

            const stickyPrice = $('[data-sticky-add-to-cart] .money-subtotal .money');
            const stickyComparePrice = $('[data-sticky-add-to-cart] .money-compare-price .money');

            if (stickyPrice.length) {
                stickyPrice.text(subTotal);
            }

            if (stickyComparePrice.length && window.subtotal.show) {
                let comparePrice = $('[data-sticky-add-to-cart] .money-compare-price').data('compare-price');
                comparePrice = inputValue * comparePrice;
                comparePrice = Shopify.formatMoney(comparePrice, window.money_format);
                comparePrice = extractContent(comparePrice);
                stickyComparePrice.text(comparePrice);
            }
        }

        if (this.classList.contains('quantity__group--2') || this.classList.contains('quantity__group--3')) {
            const mainQty = document.querySelector('.quantity__group--1 .quantity__input');
            if (mainQty != null){
                mainQty.value = inputValue;
            }

            const mainQty2Exists = !!document.querySelector('.quantity__group--2 .quantity__input');
            const mainQty3Exists = !!document.querySelector('.quantity__group--3 .quantity__input');

            if (this.classList.contains('quantity__group--2') && mainQty3Exists) {
                const mainQty3 = document.querySelector('.quantity__group--3 .quantity__input');
                mainQty3.value = inputValue;
            }
            else if (this.classList.contains('quantity__group--3') && mainQty2Exists) {
                const mainQty2 = document.querySelector('.quantity__group--2 .quantity__input');
                mainQty2.value = inputValue;
            }
        }
    }

    onButtonClick(event) {
        event.preventDefault();
        const previousValue = this.input.value;
        
        event.target.name === 'plus' ? this.input.stepUp() : this.input.stepDown();
        if (previousValue !== this.input.value) this.input.dispatchEvent(this.changeEvent);
    }

    checkNeedToConvertCurrency() {
        return (window.show_multiple_currencies && Currency.currentCurrency != shopCurrency) || window.show_auto_currency;
    }
    
    checkHasMultipleVariants() {
        const arrayInVarName = `product_inven_array_${this.querySelector('[data-product]').dataset.product}`
        this.inven_array = window[arrayInVarName];
        return Object.keys(this.inven_array).length > 1
    }
        
    initProductQuantity() {
        if(this.inven_array != undefined) {
            var inven_num = Object.values(this.inven_array),
                inventoryQuantity = parseInt(inven_num);

            this.querySelector('input[name="quantity"]').setAttribute('data-inventory-quantity', inventoryQuantity);
            this.querySelector('input[name="quantity"]').dataset.inventoryQuantity = inventoryQuantity
        }
    }

    checkVariantInventory() {
        const addBtn = document.getElementById('product-add-to-cart');
        if (!addBtn) return;
        this.input.disabled = addBtn.disabled;
        this.querySelector('.btn-quantity.minus').disabled = addBtn.disabled;
        this.querySelector('.btn-quantity.plus').disabled = addBtn.disabled;
    }

    getVariantData() {
        this.variantData = this.variantData || JSON.parse(document.querySelector('.product-option [type="application/json"]').textContent);
        return this.variantData;
    }
}

customElements.define('quantity-input', QuantityInput);

function hotStock(inventoryQuantity) {
    const productView = document.querySelector('.productView');
    const hotStock = productView.querySelector('.productView-hotStock');
    if(hotStock) {
        let hotStockText = hotStock.querySelector('.hotStock-text'),
            maxStock = parseFloat(hotStock.dataset.hotStock),
            textStock;

        if(inventoryQuantity > 0 && inventoryQuantity <= maxStock){
            hotStock.matches('.style-2') ? textStock  = window.inventory_text.hotStock2.replace('[inventory]', inventoryQuantity) : textStock  = window.inventory_text.hotStock.replace('[inventory]', inventoryQuantity);
            if (hotStockText) hotStockText.innerHTML = textStock;
            hotStock.classList.remove('is-hide');
        } else {
            hotStock.classList.add('is-hide');
        }

        if (hotStock.matches('.style-2')) {
            const invenProgress = inventoryQuantity / maxStock * 100,
                hotStockProgressItem = hotStock.querySelector('.hotStock-progress-item');
            if (hotStockProgressItem) hotStockProgressItem.style.width = `${invenProgress}%`;
        }
    }
}
const hotStockNoOptions = document.querySelector('.productView .productView-hotStock[data-current-inventory]');
if (hotStockNoOptions) {
    const inventoryQuantity = parseFloat(hotStockNoOptions.dataset.currentInventory);
    hotStock(inventoryQuantity);
}


function showWarning(content, time = null) {
    if (window.warningTimeout) {
        clearTimeout(window.warningTimeout);
    }
    const warningPopupContent = document.getElementById('halo-warning-popup').querySelector('[data-halo-warning-content]')
    warningPopupContent.textContent = content
    document.body.classList.add('has-warning')

    if (time) {
        window.warningTimeout = setTimeout(() => {
            document.body.classList.remove('has-warning')
        }, time)
    }
}

function getInputMessage(maxValue) {
    var message = window.cartStrings.addProductOutQuantity.replace('[maxQuantity]', maxValue);
    return message
}
/* START KLAVIYO DRAWER CART */
(function() {
    let debounceTimer;
    let lastCartState = '';

    
    async function getCartWithTags() {
        try {
            const cartResponse = await fetch(window.Shopify.routes.root + "cart.js");
            const cart = await cartResponse.json();

            // Prevent spam: Check if the cart is exactly the same as the last time we checked
            const currentState = `${cart.token}_${cart.total_price}_${cart.item_count}`;
            if (currentState === lastCartState) {
               //  console.log("Cart state hasn't changed since last click, skipping Klaviyo push.");
                return; 
            }
            lastCartState = currentState;

            if (cart.item_count === 0) {
                const drawerCart = { ItemCount: 0, EmptyCart: true };
                var klaviyo = window.klaviyo || [];
                if (typeof klaviyo.track === 'function') {
                    klaviyo.track("Started Drawer Cart", drawerCart);
                } else {
                    klaviyo.push(['track', "Started Drawer Cart", drawerCart]);
                }
                // console.log("🚀 Sending to Klaviyo (Empty):", drawerCart);
                return;
            }

            const itemsWithTags = await Promise.all(
                cart.items.map(async (item) => {
                    const productResponse = await fetch(`${window.Shopify.routes.root}products/${item.handle}.js`);
                    const productData = await productResponse.json();
                    return { ...item, tags: productData.tags, comparePrice: productData.compare_at_price };
                })
            );

            const reclaimItems = itemsWithTags.map((item) => `${item.variant_id}:${item.quantity}`).join(",");
            const discountCodes = cart.discount_codes ? cart.discount_codes.map((d) => d.code.toUpperCase()) : [];

            const klaviyoItems = itemsWithTags.map((item) => {
                const itemData = {
                    ProductID: item.product_id.toString(),
                    VariantID: item.variant_id.toString(),
                    SKU: item.sku,
                    ProductName: item.product_title,
                    Quantity: item.quantity,
                    ItemPrice: item.price / 100,
                    RowTotal: (item.price * item.quantity) / 100,
                    ProductURL: `${window.location.origin}${item.url}`,
                    ImageURL: item.image,
                    Tags: item.tags,
                    ProductType: item.product_type
                };
                if (item.comparePrice != null ) {
                    itemData["ComparePrice"] = item.comparePrice  / 100;
                }
                const scentTag = item.tags.find((tag) => tag.startsWith("scent-notes-"));
                if (scentTag) itemData["ScentNotes"] = scentTag.replace("scent-notes-", "").split("_").join(", ");

                if (item.product_type && item.product_type.includes("Bundle")) {
                    const bundleTag = item.tags.find((tag) => tag.startsWith("candle-bundle-"));
                    if (bundleTag)
                        itemData["CandleBundle"] = bundleTag.replace("candle-bundle-", "").split("_").join(", ");

                    const savings = (item.original_price - item.discounted_price) / 100;
                    if (savings > 0) itemData["BundleSavings"] = savings;
                }

                if (item.options_with_values) {
                    item.options_with_values.forEach((opt) => {
                        if (opt.value !== "Default Title") itemData[opt.name] = opt.value;
                    });
                }
                return itemData;
            });

            const drawerCart = {
                $event_id: (cart.token || "cart") + "_" + Date.now(),
                $value: cart.total_price / 100,
                ItemCount: cart.item_count,
                ItemNames: itemsWithTags.map((item) => item.product_title),
                CheckoutURL: `https://www.jacksonvaughn.com/cart/${reclaimItems}`,
                Discounts: discountCodes,
                DiscountValue: cart.total_discount / 100,
                CartItemTags: [...new Set(itemsWithTags.flatMap((item) => item.tags))],
                Items: klaviyoItems
            };

            // console.log("🚀 Sending to Klaviyo:", drawerCart);
            
            var klaviyo = window.klaviyo || [];
            if (typeof klaviyo.track === 'function') {
                klaviyo.track("Started Drawer Cart", drawerCart);
            } else {
                klaviyo.push(['track', "Started Drawer Cart", drawerCart]);
            }

        } catch (error) {
            console.error("Error in Klaviyo Drawer Script:", error);
        }
    }

    document.addEventListener('pointerdown', function(event) {
        
        
        const targetSelectors = '#upCart, .cart-count-bubble, #product-add-to-cart';
        const clickedElement = event.target.closest(targetSelectors);

        if (clickedElement) {
            // console.log("Cart interaction detected - Checking cart state in 1.5s");
            
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                getCartWithTags();
            }, 1500); 
        }
    }, true); 

})();
/* END KLAVIYO DRAWER CART */
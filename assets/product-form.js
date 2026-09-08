class ProductForm extends HTMLElement {
    constructor() {
        super();   

        this.form = this.querySelector('form');
        this.form.addEventListener('submit', this.onSubmitHandler.bind(this));
        this.cartNotification = document.querySelector('cart-notification');
    }

    onSubmitHandler(evt) {
        evt.preventDefault();
        this.cartNotification.setActiveElement(document.activeElement);
    
        const submitButton = this.querySelector('[type="submit"]');

        submitButton.setAttribute('disabled', true);
        submitButton.classList.add('loading');

        // serializeForm flattens line item properties into bracketed keys
        // ("properties[Recipient email]"). /cart/add.js only parses those from a
        // form-encoded body, not from JSON, so nest them back under `properties`
        // and drop the blanks left behind by an unused gift card recipient form.
        const formValues = JSON.parse(serializeForm(this.form));
        const properties = {};

        Object.entries(formValues).forEach(([key, value]) => {
            const match = key.match(/^properties\[(.+)\]$/);
            if (!match) return;

            delete formValues[key];
            if (value !== '') properties[match[1]] = value;
        });

        const body = JSON.stringify({
            ...formValues,
            ...(Object.keys(properties).length ? { properties } : {}),
            sections: this.cartNotification.getSectionsToRender().map((section) => section.id),
            sections_url: window.location.pathname
        });

        fetch(`${routes.cart_add_url}`, { ...fetchConfig('javascript'), body })
        .then((response) => response.json())
        .then((parsedState) => {
            this.cartNotification.renderContents(parsedState);
        })
        .catch((e) => {
            console.error(e);
        })
        .finally(() => {
            submitButton.classList.remove('loading');
            submitButton.removeAttribute('disabled');
        });
    }
}

customElements.define('product-form', ProductForm);

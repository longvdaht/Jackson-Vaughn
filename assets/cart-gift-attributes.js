if (!customElements.get('cart-gift-attributes')) {
  customElements.define('cart-gift-attributes', class CartGiftAttributes extends HTMLElement {
    constructor() {
      super();
      this.checkbox = this.querySelector('input[type="checkbox"]');
      this.fieldsContainer = this.querySelector('.cart-gift-attributes__fields');
      this.inputs = this.querySelectorAll('input[type="text"], textarea');

      this.checkbox.addEventListener('change', (event) => {
        this.toggleFields();
        this.updateAttributes();
      });

      const debouncedUpdate = debounce((event) => {
        this.updateAttributes();
      }, 500);

      this.addEventListener('input', (event) => {
        if (event.target !== this.checkbox) {
          debouncedUpdate(event);
        }
      });
    }

    toggleFields() {
      if (this.checkbox.checked) {
        this.fieldsContainer.style.display = 'block';
      } else {
        this.fieldsContainer.style.display = 'none';
        this.inputs.forEach(input => {
          input.value = '';
        });
      }
    }

    updateAttributes() {
      const formData = new FormData();
      const isChecked = this.checkbox.checked;
      const hasValue = Array.from(this.inputs).some(input => input.value.trim() !== '');

      formData.append(this.checkbox.name, (isChecked && hasValue) ? "Yes" : "");

      this.inputs.forEach(input => {
        formData.append(input.name, isChecked ? input.value : "");
      });

      fetch(window.Shopify.routes.root + 'cart/update.js', {
        method: 'POST',
        body: formData
      })
          .then(response => response.json())
          .then(state => {
            console.log('Cart attributes updated', state);
          })
          .catch(error => {
            console.error('Error updating cart attributes:', error);
          });
    }
  });
}
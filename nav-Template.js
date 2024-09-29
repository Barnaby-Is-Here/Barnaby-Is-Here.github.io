class NavComponent extends HTMLElement {
  connectedCallback() {
    fetch('/templates/nav.html')
      .then(response => response.text())
      .then(data => {
        this.innerHTML = data;
    });
  }
}
customElements.define('custom-nav', NavComponent);
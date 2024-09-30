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

class RecipeBoxComponent extends HTMLElement {
  constructor() {
      super();
      this.recipeData = null; // Initialize recipe data
  }

  connectedCallback() {
      fetch('/templates/recipe-box.html')
          .then(response => response.text())
          .then(data => {
              this.innerHTML = data;
              if (this.recipeData) {
                  this.fillInRecipeBox(this.recipeData); // Fill in data if it was set before
              }
          });
  }

  setRecipeData(recipe) {
      this.recipeData = recipe; // Store the recipe data
      if (this.isConnected) {
          this.fillInRecipeBox(recipe); // Fill in data if the element is already connected
      }
  }

  fillInRecipeBox(recipe) {

      // Update the recipe name
      const nameElement = this.querySelector('#recipe-name');
      nameElement.textContent = recipe.Name;

      // Update the ingredients list
      const ingredientList = this.querySelector('#ingredient-list');
      ingredientList.innerHTML = '';
      recipe.Ingredients.split(',').forEach(ingredient => {
          const li = document.createElement('li');
          li.textContent = ingredient.trim();
          ingredientList.appendChild(li);
      });

      // Update the method text
      const methodElement = this.querySelector('#method');
      methodElement.textContent = recipe.Method;

      // Update the tags area
      const tagArea = this.querySelector('#tag-area');
      tagArea.innerHTML = '';
      recipe.Tags.split(',').forEach(tag => {
          const span = document.createElement('span');
          span.className = 'tag';
          span.textContent = tag.trim();
          tagArea.appendChild(span);
      });

      // Update the recipe photo
      const photoElement = this.querySelector('#recipe-photo');
      const cleanImageUrl = recipe.Picture.split('&export=download')[0]; // Remove export parameter
      const directImageUrl = `https://drive.google.com/thumbnail?id=${cleanImageUrl.split('=')[1]}`; // Format for thumbnail
      photoElement.src = directImageUrl;
      photoElement.alt = recipe.Name;
  }
}
customElements.define('recipe-box', RecipeBoxComponent);
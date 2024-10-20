class NavComponent extends HTMLElement {
  connectedCallback() {
    fetch('/templates/nav.html')
      .then(response => response.text())
      .then(data => {
        this.innerHTML = data;
        this.staticUI();

    });
  }

  // Update static UI elements
  staticUI() {
    // Resize UI
    const header = document.querySelector('header');
    const headerHeight = (header !== null) ? header.offsetHeight + 'px' : "30px";
    document.documentElement.style.setProperty('--header-nav-height', headerHeight);

    const recipeNav = document.getElementById('recipe-nav');
    const recipeWidth = (recipeNav !== null) ?  recipeNav.offsetWidth + 'px' : "30px";
    document.documentElement.style.setProperty('--recipe-nav-width', recipeWidth);
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

    const items = ingredientList.querySelectorAll('li');

    // Set max items per column and calculate the number of columns needed
    const maxItemsPerColumn = 10;  // Adjust this based on your desired height
    const columns = Math.ceil(items.length / maxItemsPerColumn);

    // Dynamically adjust the CSS grid column count
    ingredientList.style.gridTemplateColumns = `repeat(${columns}, minmax(150px, 1fr))`;

    // Update the method text
    const methodElement = this.querySelector('#method');
    methodElement.textContent = recipe.Method;

    // Update the tags area
    const tagArea = this.querySelector('#tag-area');
    tagArea.innerHTML = '<strong>Tags:</strong>';
    recipe.Tags.split(',').forEach(tag => {
        const span = document.createElement('span');
        span.textContent = tag.trim();
        tagArea.appendChild(span);
    });

    // Set config link
    const editBtn = this.querySelector('#recipe-change-link');
    editBtn.href = "add-recipe.html?path=" + recipe.Path +"&name=" + recipe.Name;

    // Update the recipe photo
    const photoElement = this.querySelector('#recipe-photo');
    const cleanImageUrl = recipe.Picture.split('&export=download')[0]; // Remove export parameter
    const directImageUrl = `https://lh3.googleusercontent.com/d/${cleanImageUrl.split('=')[1]}`; // Format for thumbnail
    photoElement.src = directImageUrl;
    photoElement.alt = recipe.Name;
  }
}
customElements.define('recipe-box', RecipeBoxComponent);
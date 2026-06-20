function getTemplateUrl(templatePath) {
  return new URL(templatePath, window.location.href).toString();
}

class NavComponent extends HTMLElement {
  async connectedCallback() {
    try {
      const response = await fetch(getTemplateUrl('templates/nav.html'));
      if (!response.ok) {
        throw new Error(`Failed to load nav template: ${response.status}`);
      }

      this.innerHTML = await response.text();
      this.staticUI();
    } catch (error) {
      console.error('Unable to render navigation template:', error);
      this.innerHTML = '';
    }
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

  async connectedCallback() {
      try {
          const response = await fetch(getTemplateUrl('templates/recipe-box.html'));
          if (!response.ok) {
              throw new Error(`Failed to load recipe box template: ${response.status}`);
          }

          this.innerHTML = await response.text();
          if (this.recipeData) {
              this.fillInRecipeBox(this.recipeData); // Fill in data if it was set before
          }
      } catch (error) {
          console.error('Unable to render recipe template:', error);
          this.innerHTML = '';
      }
  }

  setRecipeData(recipe) {
      this.recipeData = recipe; // Store the recipe data
      if (this.isConnected) {
          this.fillInRecipeBox(recipe); // Fill in data if the element is already connected
      }
  }

  fillInRecipeBox(recipe) {
    if (!recipe) {
      return;
    }

    // Update the recipe name
    const nameElement = this.querySelector('#recipe-name');
    if (nameElement) {
      nameElement.textContent = recipe.Name ?? '';
    }

    // Update the ingredients list
    const ingredientList = this.querySelector('#ingredient-list');
    if (!ingredientList) {
      return;
    }

    ingredientList.innerHTML = '';
    const ingredients = typeof recipe.Ingredients === 'string'
      ? recipe.Ingredients.split(',')
      : [];

    ingredients.forEach(ingredient => {
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
    if (methodElement) {
      methodElement.textContent = recipe.Method ?? '';
    }

    // Update the tags area
    const tagArea = this.querySelector('#tag-area');
    if (tagArea) {
      tagArea.innerHTML = '<strong>Tags:</strong>';
      const tags = typeof recipe.Tags === 'string'
        ? recipe.Tags.split(',')
        : [];

      tags.forEach(tag => {
          const span = document.createElement('span');
          span.textContent = tag.trim();
          tagArea.appendChild(span);
      });
    }

    // Set config link
    const editBtn = this.querySelector('#recipe-change-link');
    if (editBtn) {
      editBtn.href = 'add-recipe.html?path=' + encodeURIComponent(recipe.Path ?? '') + '&name=' + encodeURIComponent(recipe.Name ?? '');
    }

    // Update the recipe photo
    const photoElement = this.querySelector('#recipe-photo');
    if (photoElement) {
      const pictureUrl = recipe.Picture;

      if (typeof pictureUrl === 'string' && pictureUrl.includes('=')) {
        const cleanImageUrl = pictureUrl.split('&export=download')[0]; // Remove export parameter
        const imageId = cleanImageUrl.split('=')[1];
        if (imageId) {
          photoElement.src = `https://lh3.googleusercontent.com/d/${imageId}`; // Format for thumbnail
        }
      } else {
        photoElement.removeAttribute('src');
      }

      photoElement.alt = recipe.Name ?? 'Recipe Photo';
    }
  }
}
customElements.define('recipe-box', RecipeBoxComponent);

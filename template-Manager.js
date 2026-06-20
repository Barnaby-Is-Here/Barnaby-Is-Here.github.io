function getTemplateUrl(templatePath) {
  return new URL(templatePath, window.location.href).toString();
}

let recipeAuthState = {
  user: null,
  isEditor: false,
  membership: null
};

function getUserDisplayName(authState = recipeAuthState) {
  if (!authState?.user) {
    return 'Guest';
  }

  if (authState.membership?.note) {
    return authState.membership.note;
  }

  const emailAddress = authState.user.email ?? '';
  return emailAddress.includes('@') ? emailAddress.split('@')[0] : emailAddress;
}

function dispatchRecipeAuthStateChanged() {
  window.dispatchEvent(new CustomEvent('recipe-auth-state-changed', {
    detail: recipeAuthState
  }));
}

class NavComponent extends HTMLElement {
  #userMenuPanel = null;
  #userMenuToggle = null;
  #newRecipeLink = null;
  #navAuthSummary = null;
  #navAuthStatus = null;
  #navEditorEmail = null;
  #navSendMagicLink = null;
  #navSignOutButton = null;
  #navDisplayName = null;
  #unsubscribeAuth = null;
  #boundOutsideClickHandler = (event) => {
    if (!this.contains(event.target)) {
      this.setUserMenuOpen(false);
    }
  };

  async connectedCallback() {
    try {
      const response = await fetch(getTemplateUrl('templates/nav.html'));
      if (!response.ok) {
        throw new Error(`Failed to load nav template: ${response.status}`);
      }

      this.innerHTML = await response.text();
      this.staticUI();
      await this.setupAuthUi();
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

  disconnectedCallback() {
    document.removeEventListener('click', this.#boundOutsideClickHandler);
    if (this.#unsubscribeAuth?.data?.subscription) {
      this.#unsubscribeAuth.data.subscription.unsubscribe();
    }
  }

  async setupAuthUi() {
    this.#userMenuPanel = this.querySelector('#user-menu-panel');
    this.#userMenuToggle = this.querySelector('#user-menu-toggle');
    this.#newRecipeLink = this.querySelector('#new-recipe-link');
    this.#navAuthSummary = this.querySelector('#nav-auth-summary');
    this.#navAuthStatus = this.querySelector('#nav-auth-status');
    this.#navEditorEmail = this.querySelector('#nav-editor-email');
    this.#navSendMagicLink = this.querySelector('#nav-send-magic-link');
    this.#navSignOutButton = this.querySelector('#nav-sign-out-editor');
    this.#navDisplayName = this.querySelector('#user-display-name');

    if (!this.#userMenuToggle || !this.#userMenuPanel) {
      return;
    }

    this.#userMenuToggle.addEventListener('click', (event) => {
      event.stopPropagation();
      this.setUserMenuOpen(this.#userMenuPanel.hidden);
    });

    this.#navSendMagicLink?.addEventListener('click', async () => {
      const emailAddress = this.#navEditorEmail?.value.trim() ?? '';
      if (!emailAddress) {
        this.#navAuthStatus.textContent = 'Enter an email address before requesting a magic link.';
        return;
      }

      this.#navSendMagicLink.disabled = true;
      this.#navAuthStatus.textContent = 'Sending magic link...';

      try {
        const authModule = await import('./data/recipe-auth.js');
        await authModule.sendRecipeEditorMagicLink(emailAddress);
        this.#navAuthStatus.textContent = `Magic link sent to ${emailAddress}. Open the email on this device to finish signing in.`;
      } catch (error) {
        this.#navAuthStatus.textContent = `Could not send magic link: ${error.message}`;
      } finally {
        this.#navSendMagicLink.disabled = false;
      }
    });

    this.#navSignOutButton?.addEventListener('click', async () => {
      try {
        const authModule = await import('./data/recipe-auth.js');
        await authModule.signOutRecipeEditor();
        this.#navAuthStatus.textContent = 'Signed out.';
        await this.refreshAuthState();
      } catch (error) {
        this.#navAuthStatus.textContent = `Could not sign out: ${error.message}`;
      }
    });

    document.addEventListener('click', this.#boundOutsideClickHandler);

    try {
      const authModule = await import('./data/recipe-auth.js');
      const authRedirectCompleted = await authModule.completeRecipeAuthRedirect();
      if (authRedirectCompleted) {
        this.#navAuthStatus.textContent = 'Magic link sign-in completed.';
      }

      await this.refreshAuthState();

      this.#unsubscribeAuth = authModule.subscribeToRecipeAuthChanges(async () => {
        await this.refreshAuthState();
      });
    } catch (error) {
      this.#navAuthStatus.textContent = `Could not load sign-in state: ${error.message}`;
    }
  }

  async refreshAuthState() {
    try {
      const authModule = await import('./data/recipe-auth.js');
      recipeAuthState = await authModule.getRecipeEditorState();
      this.applyAuthUi();
      dispatchRecipeAuthStateChanged();
    } catch (error) {
      recipeAuthState = {
        user: null,
        isEditor: false,
        membership: null
      };
      this.applyAuthUi();
      dispatchRecipeAuthStateChanged();
      throw error;
    }
  }

  applyAuthUi() {
    const displayName = getUserDisplayName();
    if (this.#navDisplayName) {
      this.#navDisplayName.textContent = displayName;
    }

    if (this.#userMenuToggle) {
      const avatar = this.#userMenuToggle.querySelector('.user-avatar');
      if (avatar) {
        avatar.textContent = displayName.charAt(0).toUpperCase();
      }
    }

    if (!recipeAuthState.user) {
      this.#navAuthSummary.textContent = 'Sign in with a magic link to add, edit, or remove recipes.';
      this.#navSignOutButton.style.display = 'none';
      this.setActionEnabled(this.#newRecipeLink, false);
      return;
    }

    this.#navSignOutButton.style.display = 'inline-block';

    if (recipeAuthState.isEditor) {
      this.#navAuthSummary.textContent = `Signed in as ${recipeAuthState.user.email}. You can add, edit, and remove recipes.`;
      this.setActionEnabled(this.#newRecipeLink, true);
    } else {
      this.#navAuthSummary.textContent = `Signed in as ${recipeAuthState.user.email}, but this account is not on the recipe editor list yet.`;
      this.setActionEnabled(this.#newRecipeLink, false);
    }
  }

  setActionEnabled(linkElement, isEnabled) {
    if (!linkElement) {
      return;
    }

    linkElement.classList.toggle('is-disabled', !isEnabled);
    linkElement.setAttribute('aria-disabled', String(!isEnabled));

    if (!isEnabled) {
      linkElement.addEventListener('click', preventDisabledNavClick);
    } else {
      linkElement.removeEventListener('click', preventDisabledNavClick);
    }
  }

  setUserMenuOpen(isOpen) {
    if (!this.#userMenuPanel || !this.#userMenuToggle) {
      return;
    }

    this.#userMenuPanel.hidden = !isOpen;
    this.#userMenuToggle.setAttribute('aria-expanded', String(isOpen));
  }
}
customElements.define('custom-nav', NavComponent);

function preventDisabledNavClick(event) {
  event.preventDefault();
}

class RecipeBoxComponent extends HTMLElement {
  constructor() {
      super();
      this.recipeData = null; // Initialize recipe data
      this.boundAuthStateHandler = () => {
        if (this.recipeData) {
          this.fillInRecipeBox(this.recipeData);
        }
      };
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
          window.addEventListener('recipe-auth-state-changed', this.boundAuthStateHandler);
      } catch (error) {
          console.error('Unable to render recipe template:', error);
          this.innerHTML = '';
      }
  }

  disconnectedCallback() {
    window.removeEventListener('recipe-auth-state-changed', this.boundAuthStateHandler);
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
      editBtn.classList.toggle('is-disabled', !recipeAuthState.isEditor);
      editBtn.setAttribute('aria-disabled', String(!recipeAuthState.isEditor));
      editBtn.onclick = recipeAuthState.isEditor ? null : function(event) {
        event.preventDefault();
      };
    }

    const deleteBtn = this.querySelector('#recipe-delete-button');
    if (deleteBtn) {
      deleteBtn.disabled = !recipeAuthState.isEditor;
      deleteBtn.onclick = recipeAuthState.isEditor
        ? async () => {
            const confirmed = window.confirm(`Delete ${recipe.Name}? This cannot be undone.`);
            if (!confirmed) {
              return;
            }

            deleteBtn.disabled = true;

            try {
              const recipeManagerModule = await import('./recipe-Manager.js');
              await recipeManagerModule.default.deleteRecipeById(recipe.Id);
            } catch (error) {
              console.error('Could not delete recipe:', error);
              window.alert(`Could not delete recipe: ${error.message}`);
              deleteBtn.disabled = false;
            }
          }
        : null;
    }

    // Update the recipe photo
    const photoElement = this.querySelector('#recipe-photo');
    if (photoElement) {
      const pictureUrl = recipe.Picture;

      if (typeof pictureUrl === 'string' && pictureUrl.trim() !== '') {
        if (pictureUrl.includes('drive.google.com') && pictureUrl.includes('=')) {
          const cleanImageUrl = pictureUrl.split('&export=download')[0]; // Remove export parameter
          const imageId = cleanImageUrl.split('=')[1];
          if (imageId) {
            photoElement.src = `https://lh3.googleusercontent.com/d/${imageId}`; // Format for thumbnail
          } else {
            photoElement.src = pictureUrl;
          }
        } else {
          photoElement.src = pictureUrl;
        }
      } else {
        photoElement.removeAttribute('src');
      }

      photoElement.alt = recipe.Name ?? 'Recipe Photo';
    }
  }
}
customElements.define('recipe-box', RecipeBoxComponent);

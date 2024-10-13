document.getElementById('new-recipe-form').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent form from submitting the traditional way
  
    const recipe = {
      name: document.getElementById('recipe-name').value,
      path: document.getElementById('recipe-path').value,
      ingredients: document.getElementById('ingredients').value.split('\n'),
      method: document.getElementById('method').value,
      tags: document.getElementById('tags').value.split(',').map(tag => tag.trim()),
      photo: document.getElementById('recipe-photo').files[0]
    };
  
    console.log(recipe); // Do something with the recipe data (e.g., save it to the server)
  });
  
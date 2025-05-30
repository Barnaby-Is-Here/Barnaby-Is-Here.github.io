import { supabase } from './supabaseClient.js';

const demoRecipes = [
  {
    name: 'Pizza',
    path: 'Italian',
    ingredients: ['Pizza'],
    method: 'Put in oven',
    tags: ['Easy']
  },
  {
    name: 'Sun Dried Tomato Pasta',
    path: 'Italian',
    ingredients: ['Sun dried tomatoes', 'Cream', 'Milk', 'Pasta', 'Garlic', 'Oil'],
    method: 'Start boiling pasta, Cut up tomatoes and fry with oil and garlic, add dashes of equal parts cream and milk until sauce thickens, add salt and pepper to taste, Combine with pasta abd a little pasta water, Stir, Serve.',
    tags: ['Gluten', 'Quick', 'Lactose', 'Easy']
  },
  {
    name: 'Sushi',
    path: 'Japanese',
    ingredients: ['Rice', 'Salmon', 'Soy Sauce', 'Seaweed', 'Sesame Seeds'],
    method: 'Lay out seaweed on a roll mat, Spread thin layer of rice over, Place strips of salmon in center, Wet end of seaweed, Roll, Sprinkle on seeds, Serve with soysauce.',
    tags: ['Gluten Free', 'Fish', 'Asian', 'Medium']
  },
  {
    name: 'Barnaby Burgers',
    path: 'American',
    ingredients: ['Buns', 'Bread crumbs', 'Minced beef', 'Egg', 'American Cheese', 'Onion', 'Spinach', 'Oil', 'Garlic Powder', 'Onion Powder', 'Paprika', 'Salt', 'Pepper', 'Chilli Powder', 'Chips'],
    method: 'Combine minced meat, bread crumbs, egg, onion powder, garlic powder, paprika, salt, pepper, and chilli powder in a mixing bowl. Mix until homogenous. Add extra bread crumbs if not holding together. Leave in fridge to cool. Cut up onion to prefered size. Set off chips in air frier. Roll wide patties from the meat. Start cooking on low to medium heat. Keep patty moving to avoid sticking. Add extra herbs and spices to onion, and saute to preference. Flip burgers twice so both sides are done. When the burgers are ready, add spinach to onion mix. Slice and start to toast buns. Place one slice of american cheese o nthe burger, then top with onion spinach mix. Top with another slice of american cheese to keep veg contained. Plate and serve in the burger buns.',
    tags: ['Meat', 'Gluten', 'Lactose', 'Medium', 'Hearty', 'Filling']
  }
];

async function addDemoRecipes() {
  try {
    const { data, error } = await supabase
      .from('recipes')
      .insert(demoRecipes);

    if (error) throw error;
    console.log('Demo recipes added successfully!');
    return data;
  } catch (error) {
    console.error('Error adding demo recipes:', error);
    throw error;
  }
}

addDemoRecipes();
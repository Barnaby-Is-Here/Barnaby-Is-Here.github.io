-- Seed data copied from the legacy Google Sheets-backed recipe store on 2026-06-20.
-- This is safe to rerun because the recipes table has a unique constraint on (path, name).

insert into public.recipes (
  name,
  path,
  ingredients,
  method,
  tags,
  picture_url
)
values
  (
    'Pizza',
    'Italian',
    'Pizza',
    'Put in oven',
    'Easy',
    'https://drive.google.com/uc?id=15zZIL563Un6332ScfPnfwfpFre24T1Fg&export=download'
  ),
  (
    'Sun Dried Tomato Pasta',
    'Italian',
    'Sun dried tomatoes, Cream, Milk, Pasta, Garlic, Oil',
    'Start boiling pasta, Cut up tomatoes and fry with oil and garlic, add dashes of equal parts cream and milk until sauce thickens, add salt and pepper to taste, Combine with pasta abd a little pasta water, Stir, Serve.',
    'Gluten, Quick, Lactose, Easy',
    'https://drive.google.com/uc?id=1r7DBbziCNsAx_EKCAa4mzo6_adtRGD1n&export=download'
  ),
  (
    'Sushi',
    'Japanese',
    'Rice, Salmon, Soy Sauce, Seaweed, Sesame Seeds',
    'Lay out seaweed on a roll mat, Spread thin layer of rice over, Place strips of salmon in center, Wet end of seaweed, Roll, Sprinkle on seeds, Serve with soysauce.',
    'Gluten Free, Fish, Asian, Medium',
    'https://drive.google.com/uc?id=1sS7A_Y3jYWgMCBgzoOyBnoN2Zm3JzJ4t&export=download'
  ),
  (
    'Barnaby Burgers',
    'American',
    'Buns, Bread crumbs, Minced beef, Egg, American Cheese, Onion, Spinach, Oil, Garlic Powder, Onion Powder, Paprika, Salt, Pepper, Chilli Powder, Chips',
    'Combine minced meat, bread crumbs, egg, onion powder, garlic powder, paprika, salt, pepper, and chilli powder in a mixing bowl. Mix until homogenous. Add extra bread crumbs if not holding together. Leave in fridge to cool. Cut up onion to prefered size. Set off chips in air frier. Roll wide patties from the meat. Start cooking on low to medium heat. Keep patty moving to avoid sticking. Add extra herbs and spices to onion, and saute to preference. Flip burgers twice so both sides are done. When the burgers are ready, add spinach to onion mix. Slice and start to toast buns. Place one slice of american cheese o nthe burger, then top with onion spinach mix. Top with another slice of american cheese to keep veg contained. Plate and serve in the burger buns.',
    'Meat, Gluten, Lactose, Medium, Hearty, Filling',
    'https://drive.google.com/uc?id=1l_h2EH2g4lNihYSe9b0GC8SSI_RDb_pi&export=download'
  )
on conflict (path, name) do update
set
  ingredients = excluded.ingredients,
  method = excluded.method,
  tags = excluded.tags,
  picture_url = excluded.picture_url,
  updated_at = timezone('utc', now());

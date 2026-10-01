// The Funny Mouse menu (TFM Menu version 3). Items with several prices on
// the printed menu (e.g. 199/249/299) are split into one item per option.
const SECTIONS = [
  ['Starters', [
    ['Veg Cutlet', 249], ['Dahi Kabab', 299], ['Chilli Paneer', 349],
    ['Manchurian (Dry)', 299], ['Manchurian (Gravy)', 399],
    ['Crispy Corn', 249], ['Mozzarella Sticks', 329], ['Honey Chilli Potato', 299],
    ['Chilli Mushroom', 299], ['Chilli Chicken', 399], ['Cigar Roll', 299],
    ['Spring Rolls', 299], ['Veg Nuggets', 199], ['Chicken Nuggets', 299]
  ]],
  ['Garlic Bread & Bruschetta', [
    ['Cheese Garlic Bread (Plain)', 199], ['Cheese Garlic Bread (Exotic)', 249],
    ['Bruschetta (Classic)', 299], ['Bruschetta (Mushroom)', 349], ['Bruschetta (Avocado)', 399],
    ['Bruschetta (Chicken & Cream)', 399]
  ]],
  ['Dimsum Mania', [
    ['Veg Dimsum (6 pcs)', 299], ['Chicken Dimsum (6 pcs)', 349]
  ]],
  ['Kids Corner', [
    ['Maggi (Plain)', 199], ['Maggi (Veg)', 249], ['Maggi (Cheese)', 249],
    ['Mexican Nachos (Plain)', 149], ['Mexican Nachos (Cheese)', 199],
    ['Popcorn (Salted)', 199], ['Cheese Toast', 249],
    ['Chilli Garlic Noodles', 299], ['Hakka Noodles', 299], ['Veg Noodles', 299],
    ['Veg Fried Rice', 299], ['Chicken Fried Rice', 399]
  ]],
  ['Pizza', [
    ['Margherita Pizza', 349], ['Farm House Pizza', 399], ['Peppy Paneer Pizza', 449],
    ['Veggie Delight Pizza', 449], ['Chicken Tikka Pizza', 499]
  ]],
  ['Continental', [
    ['Grilled Veg Panini', 299], ['Grilled Non-Veg Panini', 349],
    ['Pita Pocket (Veg)', 299], ['Pita Pocket (Non-Veg)', 399]
  ]],
  ['Mr. Potato', [
    ['French Fries (Masala)', 199], ['French Fries (Peri Peri)', 249], ['French Fries (Cheese)', 299],
    ['Smiley', 199], ['Potato Wedges', 249], ['Veggie Stick', 249], ['Mr. Potato Combo', 349]
  ]],
  ['Combo (Veg)', [
    ['Manchurian with Fried Rice / Garlic Noodles', 399],
    ['Butter Paneer Masala with Malabar Paratha', 449],
    ['Dal Makhani with Malabar Paratha / Steam Rice', 449],
    ['Thai Curry (Veg) with Herb Rice', 499], ['Thai Curry (Non-Veg) with Herb Rice', 549],
    ['Chhole Bhature', 249]
  ]],
  ['Combo (Non-Veg)', [
    ['Butter Chicken with Malabar Paratha', 499],
    ['Chicken Manchurian with Egg Fried Rice', 499],
    ['Thai Chicken Curry with Herb Rice', 549]
  ]],
  ['Pasta', [
    ['Pasta Penne/Spaghetti/Fusilli (Veg)', 299], ['Pasta Penne/Spaghetti/Fusilli (Non-Veg)', 349],
    ['Mac N Cheese (Veg)', 349], ['Mac N Cheese (Non-Veg)', 399]
  ]],
  ['Shakes', [
    ['Cold Coffee', 249], ['Vanilla Shake', 249], ['Cold Coffee with Ice Cream', 299],
    ['Chocolate Chip Shake', 299], ['Kit Kat Shake', 299], ['Oreo Shake', 299], ['Strawberry Shake', 299]
  ]],
  ['Hot Beverages', [
    ['Green Tea', 129], ['Lemon Tea', 129], ['Masala Chai', 149], ['Americano', 249],
    ['Cappuccino', 249], ['Hot Chocolate', 299], ['Mochaccino', 299]
  ]],
  ['Cold Beverages', [
    ['Aerated Drinks', 149], ['Coconut Water', 199], ['Fresh Lime Soda', 199], ['Iced Americano', 199],
    ['Iced Tea / Peach Tea', 199], ['Fruit Punch', 249], ['Mojito', 249]
  ]],
  ['Wraps & Sandwiches', [
    ['Cottage Cheese Wrap / Roll', 299], ['Chicken Wrap / Roll', 399], ['Bombay Sandwich', 399],
    ['Chicken Club Sandwich (Grilled)', 399], ['Veg Club Sandwich', 349],
    ['Shredded Chicken Sandwich (Grilled)', 399]
  ]],
  ['Desserts', [
    ['Ice Cream (Single Scoop)', 149], ['Ice Cream (Double Scoop)', 199],
    ['Gulab Jamun', 249], ['Brownie with Ice Cream', 299]
  ]],
  ['Healthy Options', [
    ['Whole Wheat Veggie Pasta', 349], ['Multi Grain Grilled Sandwich', 349],
    ['Whole Wheat Thin Crust Pizza', 399], ['Paneer Power Bowl', 399], ['Tofu Power Bowl', 449],
    ['Grilled Chicken Paneer Bowl', 499], ['Caesar Salad (Veg)', 349], ['Caesar Salad (Non-Veg)', 349],
    ['Chickpea Salad', 399]
  ]],
  ['Sushi', [
    ['Asparagus Tempura Uramaki (4 pcs)', 599], ['Asparagus Tempura Uramaki (8 pcs)', 1099],
    ['Asparagus Tempura Uramaki (12 pcs)', 1499],
    ['Special Kappa Maki (4 pcs)', 599], ['Special Kappa Maki (8 pcs)', 1099],
    ['Special Kappa Maki (12 pcs)', 1499],
    ['Chicken Katsu Uramaki (4 pcs)', 599], ['Chicken Katsu Uramaki (8 pcs)', 1099],
    ['Chicken Katsu Uramaki (12 pcs)', 1499]
  ]]
];

let n = 0;
module.exports = SECTIONS.flatMap(([category, items]) =>
  items.map(([name, price]) => ({ id: 'm' + (++n), name, price, category, available: true })));

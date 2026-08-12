// Curated reference values per typical serving — this app is fully offline
// (local SQLite, no backend/API), so this ships as a static bundled list
// rather than calling a nutrition API. Values are typical/approximate for a
// standard serving, not lab-measured — users can still edit them after
// picking, since real portions vary.
export const FOOD_CATEGORIES = ['Indian - North', 'Indian - South', 'Indian - Other', 'Continental', 'Staples & Snacks'];

export const FOOD_DATABASE = [
  // Indian - North
  { name: 'Roti / Chapati', category: 'Indian - North', serving: '1 piece', caloriesKcal: 120, proteinG: 3, carbsG: 20, fatsG: 3 },
  { name: 'Naan', category: 'Indian - North', serving: '1 piece', caloriesKcal: 260, proteinG: 8, carbsG: 45, fatsG: 5 },
  { name: 'Paneer Butter Masala', category: 'Indian - North', serving: '1 cup', caloriesKcal: 420, proteinG: 14, carbsG: 15, fatsG: 33 },
  { name: 'Dal Makhani', category: 'Indian - North', serving: '1 cup', caloriesKcal: 280, proteinG: 10, carbsG: 28, fatsG: 14 },
  { name: 'Rajma (Kidney Bean Curry)', category: 'Indian - North', serving: '1 cup', caloriesKcal: 260, proteinG: 12, carbsG: 40, fatsG: 6 },
  { name: 'Chole (Chickpea Curry)', category: 'Indian - North', serving: '1 cup', caloriesKcal: 270, proteinG: 11, carbsG: 38, fatsG: 8 },
  { name: 'Butter Chicken', category: 'Indian - North', serving: '1 cup', caloriesKcal: 490, proteinG: 26, carbsG: 12, fatsG: 37 },
  { name: 'Palak Paneer', category: 'Indian - North', serving: '1 cup', caloriesKcal: 320, proteinG: 13, carbsG: 12, fatsG: 25 },
  { name: 'Aloo Paratha', category: 'Indian - North', serving: '1 piece', caloriesKcal: 260, proteinG: 5, carbsG: 36, fatsG: 11 },
  { name: 'Chicken Biryani', category: 'Indian - North', serving: '1 plate', caloriesKcal: 550, proteinG: 25, carbsG: 65, fatsG: 20 },
  { name: 'Veg Biryani', category: 'Indian - North', serving: '1 plate', caloriesKcal: 450, proteinG: 9, carbsG: 70, fatsG: 14 },
  { name: 'Samosa', category: 'Indian - North', serving: '1 piece', caloriesKcal: 260, proteinG: 4, carbsG: 24, fatsG: 17 },
  { name: 'Tandoori Chicken', category: 'Indian - North', serving: '100 g', caloriesKcal: 190, proteinG: 26, carbsG: 3, fatsG: 8 },
  { name: 'Rogan Josh', category: 'Indian - North', serving: '1 cup', caloriesKcal: 400, proteinG: 24, carbsG: 10, fatsG: 28 },
  { name: 'Plain Basmati Rice', category: 'Indian - North', serving: '1 cup cooked', caloriesKcal: 210, proteinG: 4, carbsG: 45, fatsG: 0.5 },

  // Indian - South
  { name: 'Idli', category: 'Indian - South', serving: '2 pieces', caloriesKcal: 140, proteinG: 4, carbsG: 28, fatsG: 1 },
  { name: 'Plain Dosa', category: 'Indian - South', serving: '1 piece', caloriesKcal: 170, proteinG: 4, carbsG: 28, fatsG: 5 },
  { name: 'Masala Dosa', category: 'Indian - South', serving: '1 piece', caloriesKcal: 340, proteinG: 6, carbsG: 50, fatsG: 12 },
  { name: 'Sambar', category: 'Indian - South', serving: '1 cup', caloriesKcal: 150, proteinG: 7, carbsG: 22, fatsG: 4 },
  { name: 'Medu Vada', category: 'Indian - South', serving: '1 piece', caloriesKcal: 130, proteinG: 4, carbsG: 14, fatsG: 7 },
  { name: 'Uttapam', category: 'Indian - South', serving: '1 piece', caloriesKcal: 220, proteinG: 5, carbsG: 34, fatsG: 7 },
  { name: 'Curd Rice', category: 'Indian - South', serving: '1 cup', caloriesKcal: 240, proteinG: 7, carbsG: 38, fatsG: 6 },
  { name: 'Rasam', category: 'Indian - South', serving: '1 cup', caloriesKcal: 60, proteinG: 2, carbsG: 10, fatsG: 1 },
  { name: 'Coconut Chutney', category: 'Indian - South', serving: '2 tbsp', caloriesKcal: 90, proteinG: 1, carbsG: 3, fatsG: 8 },
  { name: 'Appam', category: 'Indian - South', serving: '1 piece', caloriesKcal: 120, proteinG: 2, carbsG: 22, fatsG: 2 },

  // Indian - Other regional
  { name: 'Dhokla', category: 'Indian - Other', serving: '100 g', caloriesKcal: 160, proteinG: 6, carbsG: 24, fatsG: 4 },
  { name: 'Thepla', category: 'Indian - Other', serving: '1 piece', caloriesKcal: 110, proteinG: 3, carbsG: 15, fatsG: 4 },
  { name: 'Pav Bhaji', category: 'Indian - Other', serving: '1 plate', caloriesKcal: 400, proteinG: 8, carbsG: 55, fatsG: 16 },
  { name: 'Vada Pav', category: 'Indian - Other', serving: '1 piece', caloriesKcal: 290, proteinG: 6, carbsG: 40, fatsG: 12 },
  { name: 'Misal Pav', category: 'Indian - Other', serving: '1 plate', caloriesKcal: 450, proteinG: 14, carbsG: 55, fatsG: 18 },
  { name: 'Bengali Fish Curry', category: 'Indian - Other', serving: '1 cup', caloriesKcal: 280, proteinG: 24, carbsG: 8, fatsG: 17 },
  { name: 'Luchi', category: 'Indian - Other', serving: '1 piece', caloriesKcal: 100, proteinG: 2, carbsG: 12, fatsG: 5 },
  { name: 'Litti Chokha', category: 'Indian - Other', serving: '2 pieces', caloriesKcal: 380, proteinG: 10, carbsG: 55, fatsG: 13 },

  // Continental
  { name: 'Grilled Chicken Breast', category: 'Continental', serving: '100 g', caloriesKcal: 165, proteinG: 31, carbsG: 0, fatsG: 4 },
  { name: 'Caesar Salad (with chicken)', category: 'Continental', serving: '1 bowl', caloriesKcal: 350, proteinG: 24, carbsG: 12, fatsG: 22 },
  { name: 'Spaghetti Bolognese', category: 'Continental', serving: '1 plate', caloriesKcal: 480, proteinG: 22, carbsG: 60, fatsG: 16 },
  { name: 'Margherita Pizza', category: 'Continental', serving: '1 slice', caloriesKcal: 250, proteinG: 10, carbsG: 30, fatsG: 10 },
  { name: 'Cheeseburger', category: 'Continental', serving: '1 burger', caloriesKcal: 540, proteinG: 26, carbsG: 40, fatsG: 30 },
  { name: 'Club Sandwich', category: 'Continental', serving: '1 sandwich', caloriesKcal: 450, proteinG: 24, carbsG: 40, fatsG: 22 },
  { name: 'Grilled Salmon', category: 'Continental', serving: '100 g', caloriesKcal: 210, proteinG: 22, carbsG: 0, fatsG: 13 },
  { name: 'Beef Steak', category: 'Continental', serving: '150 g', caloriesKcal: 380, proteinG: 40, carbsG: 0, fatsG: 24 },
  { name: 'Mashed Potatoes', category: 'Continental', serving: '1 cup', caloriesKcal: 220, proteinG: 4, carbsG: 35, fatsG: 8 },
  { name: 'Caprese Salad', category: 'Continental', serving: '1 bowl', caloriesKcal: 280, proteinG: 14, carbsG: 8, fatsG: 22 },

  // Staples & Snacks
  { name: 'White Rice, cooked', category: 'Staples & Snacks', serving: '1 cup', caloriesKcal: 205, proteinG: 4, carbsG: 45, fatsG: 0.5 },
  { name: 'Brown Rice, cooked', category: 'Staples & Snacks', serving: '1 cup', caloriesKcal: 215, proteinG: 5, carbsG: 45, fatsG: 2 },
  { name: 'Boiled Egg', category: 'Staples & Snacks', serving: '1 large', caloriesKcal: 78, proteinG: 6, carbsG: 0.6, fatsG: 5 },
  { name: 'Banana', category: 'Staples & Snacks', serving: '1 medium', caloriesKcal: 105, proteinG: 1, carbsG: 27, fatsG: 0.4 },
  { name: 'Apple', category: 'Staples & Snacks', serving: '1 medium', caloriesKcal: 95, proteinG: 0.5, carbsG: 25, fatsG: 0.3 },
  { name: 'Milk (whole)', category: 'Staples & Snacks', serving: '1 cup', caloriesKcal: 150, proteinG: 8, carbsG: 12, fatsG: 8 },
  { name: 'Greek Yogurt, plain', category: 'Staples & Snacks', serving: '100 g', caloriesKcal: 60, proteinG: 10, carbsG: 4, fatsG: 0.4 },
  { name: 'Almonds', category: 'Staples & Snacks', serving: '10 pieces', caloriesKcal: 70, proteinG: 3, carbsG: 2, fatsG: 6 },
  { name: 'Oats, cooked', category: 'Staples & Snacks', serving: '1 cup', caloriesKcal: 160, proteinG: 6, carbsG: 27, fatsG: 3 },
  { name: 'Peanut Butter', category: 'Staples & Snacks', serving: '1 tbsp', caloriesKcal: 95, proteinG: 4, carbsG: 3, fatsG: 8 },
  { name: 'Whole Wheat Bread', category: 'Staples & Snacks', serving: '1 slice', caloriesKcal: 80, proteinG: 4, carbsG: 14, fatsG: 1 },
  { name: 'Black Coffee', category: 'Staples & Snacks', serving: '1 cup', caloriesKcal: 2, proteinG: 0, carbsG: 0, fatsG: 0 },
  { name: 'Green Tea', category: 'Staples & Snacks', serving: '1 cup', caloriesKcal: 2, proteinG: 0, carbsG: 0, fatsG: 0 },
];

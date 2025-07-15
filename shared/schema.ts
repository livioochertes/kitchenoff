import { pgTable, text, serial, integer, boolean, decimal, timestamp, jsonb, varchar, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  isAdmin: boolean("is_admin").default(false),
  // 2FA fields
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  twoFactorSecret: text("two_factor_secret"),
  twoFactorBackupCodes: jsonb("two_factor_backup_codes").default([]),
  // Invoice details fields
  companyName: varchar("company_name", { length: 255 }),
  vatNumber: varchar("vat_number", { length: 50 }),
  registrationNumber: varchar("registration_number", { length: 50 }),
  taxId: varchar("tax_id", { length: 50 }),
  companyAddress: text("company_address"),
  companyCity: varchar("company_city", { length: 100 }),
  companyState: varchar("company_state", { length: 100 }),
  companyZip: varchar("company_zip", { length: 20 }),
  companyCountry: varchar("company_country", { length: 100 }),
  billingEmail: varchar("billing_email", { length: 255 }),
  billingPhone: varchar("billing_phone", { length: 30 }),
  // Delivery address (if different from company address)
  deliveryAddress: text("delivery_address"),
  deliveryCity: varchar("delivery_city", { length: 100 }),
  deliveryState: varchar("delivery_state", { length: 100 }),
  deliveryZip: varchar("delivery_zip", { length: 20 }),
  deliveryCountry: varchar("delivery_country", { length: 100 }),
  deliveryInstructions: text("delivery_instructions"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Categories table
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Products table
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  compareAtPrice: decimal("compare_at_price", { precision: 10, scale: 2 }),
  categoryId: integer("category_id").references(() => categories.id),
  imageUrl: text("image_url"),
  images: jsonb("images").default([]),
  inStock: boolean("in_stock").default(true),
  stockQuantity: integer("stock_quantity").default(0),
  featured: boolean("featured").default(false),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
  reviewCount: integer("review_count").default(0),
  // Business fields
  vatQuote: decimal("vat_quote", { precision: 5, scale: 2 }),
  productCode: varchar("product_code", { length: 100 }),
  productType: varchar("product_type", { length: 20 }).default("product"), // "product" or "service"
  unitMeasure: varchar("unit_measure", { length: 50 }),
  countryOfOrigin: varchar("country_of_origin", { length: 100 }),
  currency: varchar("currency", { length: 3 }).default("EUR"),
  ncCode: varchar("nc_code", { length: 20 }),
  cpvCode: varchar("cpv_code", { length: 20 }),
  typeCode: varchar("type_code", { length: 50 }), // EAN Location, Common Language, EDI, HEAG, etc.
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Orders table
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  shippingAddress: jsonb("shipping_address").notNull(),
  billingAddress: jsonb("billing_address").notNull(),
  paymentMethod: varchar("payment_method", { length: 50 }).notNull(),
  paymentStatus: varchar("payment_status", { length: 50 }).notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Order items table
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id),
  productId: integer("product_id").references(() => products.id),
  quantity: integer("quantity").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
});

// Cart items table (for persistent cart)
export const cartItems = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  productId: integer("product_id").references(() => products.id),
  quantity: integer("quantity").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Reviews table
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id),
  userId: integer("user_id").references(() => users.id),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Settings table for default values
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value"),
  description: text("description"),
  category: varchar("category", { length: 50 }).default("general"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
  cartItems: many(cartItems),
  reviews: many(reviews),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  orderItems: many(orderItems),
  cartItems: many(cartItems),
  reviews: many(reviews),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  user: one(users, {
    fields: [cartItems.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [cartItems.productId],
    references: [products.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  product: one(products, {
    fields: [reviews.productId],
    references: [products.id],
  }),
  user: one(users, {
    fields: [reviews.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({
  id: true,
});

export const insertCartItemSchema = createInsertSchema(cartItems).omit({
  id: true,
  createdAt: true,
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
});

export const insertSettingsSchema = createInsertSchema(settings).omit({
  id: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type CartItem = typeof cartItems.$inferSelect;
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;
export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Settings = typeof settings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;

// Additional types for API responses
export type ProductWithCategory = Product & { category: Category | null };
export type OrderWithItems = Order & { items: (OrderItem & { product: Product })[] };
export type CartItemWithProduct = CartItem & { product: Product };

// Business field constants
export const TYPE_CODE_OPTIONS = [
  { value: "EAN", label: "EAN Location Code" },
  { value: "COMMON_LANG", label: "Common Language" },
  { value: "EDI", label: "EDI Code" },
  { value: "HEAG", label: "HEAG Code" },
  { value: "GTIN", label: "GTIN Code" },
  { value: "UPC", label: "UPC Code" },
  { value: "ISBN", label: "ISBN Code" },
  { value: "ISSN", label: "ISSN Code" },
] as const;

export const UNIT_MEASURE_OPTIONS = [
  { value: "pcs", label: "Pieces" },
  { value: "kg", label: "Kilograms" },
  { value: "g", label: "Grams" },
  { value: "l", label: "Liters" },
  { value: "ml", label: "Milliliters" },
  { value: "m", label: "Meters" },
  { value: "cm", label: "Centimeters" },
  { value: "m2", label: "Square meters" },
  { value: "m3", label: "Cubic meters" },
  { value: "set", label: "Sets" },
  { value: "pack", label: "Packs" },
  { value: "box", label: "Boxes" },
  { value: "pair", label: "Pairs" },
  { value: "roll", label: "Rolls" },
  { value: "sheet", label: "Sheets" },
] as const;

export const CURRENCY_OPTIONS = [
  { value: "EUR", label: "EUR - Euro" },
  { value: "USD", label: "USD - US Dollar" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "RON", label: "RON - Romanian Leu" },
  { value: "BGN", label: "BGN - Bulgarian Lev" },
  { value: "HUF", label: "HUF - Hungarian Forint" },
  { value: "PLN", label: "PLN - Polish Zloty" },
  { value: "CZK", label: "CZK - Czech Koruna" },
] as const;

// NC Code (Combined Nomenclature) - Common kitchen equipment codes
export const NC_CODE_OPTIONS = [
  { value: "73211100", label: "73211100 - Cooking appliances and plate warmers, for gas fuel or for both gas and other fuels" },
  { value: "73211200", label: "73211200 - Cooking appliances and plate warmers, for liquid fuel" },
  { value: "73211900", label: "73211900 - Cooking appliances and plate warmers, for solid fuel and other" },
  { value: "73218100", label: "73218100 - Cooking appliances and plate warmers, for gas fuel or for both gas and other fuels" },
  { value: "73218200", label: "73218200 - Cooking appliances and plate warmers, for liquid fuel" },
  { value: "73218900", label: "73218900 - Cooking appliances and plate warmers, for solid fuel and other" },
  { value: "73239100", label: "73239100 - Table, kitchen or other household articles, and parts thereof, of stainless steel" },
  { value: "73239200", label: "73239200 - Table, kitchen or other household articles, and parts thereof, of cast iron" },
  { value: "73239300", label: "73239300 - Table, kitchen or other household articles, and parts thereof, of iron or steel" },
  { value: "76151100", label: "76151100 - Table, kitchen or other household articles and parts thereof, of aluminum" },
  { value: "69111000", label: "69111000 - Tableware and kitchenware, of porcelain or china" },
  { value: "69120000", label: "69120000 - Ceramic tableware, kitchenware, other household articles and toilet articles" },
  { value: "82111000", label: "82111000 - Sets of assorted articles of cutlery" },
  { value: "82119100", label: "82119100 - Table knives having fixed blades" },
  { value: "82119200", label: "82119200 - Knives having fixed blades" },
  { value: "82119300", label: "82119300 - Knives having other than fixed blades" },
  { value: "82119400", label: "82119400 - Blades for knives" },
  { value: "82119500", label: "82119500 - Handles of base metal for knives" },
  { value: "82121000", label: "82121000 - Razors" },
  { value: "82130000", label: "82130000 - Scissors, tailors' shears and similar shears" },
  { value: "82141000", label: "82141000 - Paper knives, letter openers, erasing knives, pencil sharpeners" },
  { value: "82142000", label: "82142000 - Manicure or pedicure sets and instruments" },
  { value: "82149000", label: "82149000 - Other articles of cutlery" },
  { value: "82151000", label: "82151000 - Sets of assorted articles containing at least one article plated with precious metal" },
  { value: "82152000", label: "82152000 - Other sets of assorted articles" },
  { value: "39241000", label: "39241000 - Tableware and kitchenware, of plastic" },
  { value: "39249000", label: "39249000 - Other household articles and toilet articles, of plastic" },
  { value: "48236100", label: "48236100 - Trays, dishes, plates, cups and the like, of paper or paperboard" },
  { value: "48236900", label: "48236900 - Other articles of paper or paperboard, of a kind used for the table" },
  { value: "94036000", label: "94036000 - Wooden furniture for kitchen" },
  { value: "84181000", label: "84181000 - Combined refrigerator-freezers, fitted with separate external doors" },
  { value: "84182100", label: "84182100 - Refrigerators, household type, compression-type" },
  { value: "84182900", label: "84182900 - Refrigerators, household type, other" },
  { value: "84183000", label: "84183000 - Freezers of the chest type, not exceeding 800 l capacity" },
  { value: "84184000", label: "84184000 - Freezers of the upright type, not exceeding 900 l capacity" },
  { value: "84185000", label: "84185000 - Other furniture for storage and display, incorporating refrigerating equipment" },
  { value: "84186100", label: "84186100 - Heat pumps other than air conditioning machines" },
  { value: "84186900", label: "84186900 - Other refrigerating or freezing equipment" },
  { value: "85162100", label: "85162100 - Storage heating radiators" },
  { value: "85162900", label: "85162900 - Other electric space heating apparatus" },
  { value: "85163100", label: "85163100 - Hair dryers" },
  { value: "85163200", label: "85163200 - Other hair-dressing apparatus" },
  { value: "85163300", label: "85163300 - Hand-drying apparatus" },
  { value: "85164000", label: "85164000 - Electric smoothing irons" },
  { value: "85165000", label: "85165000 - Microwave ovens" },
  { value: "85166000", label: "85166000 - Other ovens; cookers, cooking plates, boiling rings, grillers and roasters" },
  { value: "85167100", label: "85167100 - Coffee or tea makers" },
  { value: "85167200", label: "85167200 - Toasters" },
  { value: "85167900", label: "85167900 - Other electro-thermic appliances" },
  { value: "85168000", label: "85168000 - Electric heating resistors" },
  { value: "85169000", label: "85169000 - Parts of electric heating apparatus" },
] as const;

// CPV Code (Common Procurement Vocabulary) - Kitchen and food service related codes
export const CPV_CODE_OPTIONS = [
  { value: "15000000", label: "15000000 - Food, beverages, tobacco and related products" },
  { value: "15100000", label: "15100000 - Animal products, meat and meat products" },
  { value: "15200000", label: "15200000 - Prepared and preserved fish" },
  { value: "15300000", label: "15300000 - Fruit, vegetables and related products" },
  { value: "15400000", label: "15400000 - Animal or vegetable oils and fats" },
  { value: "15500000", label: "15500000 - Dairy products" },
  { value: "15600000", label: "15600000 - Grain mill products, starches and starch products" },
  { value: "15700000", label: "15700000 - Animal feeds" },
  { value: "15800000", label: "15800000 - Miscellaneous food products" },
  { value: "15900000", label: "15900000 - Beverages, tobacco and related products" },
  { value: "39241000", label: "39241000 - Tableware and kitchenware" },
  { value: "39000000", label: "39000000 - Furniture (including office furniture), furnishings, domestic appliances and cleaning products" },
  { value: "39100000", label: "39100000 - Furniture and furnishings" },
  { value: "39200000", label: "39200000 - Domestic appliances" },
  { value: "39300000", label: "39300000 - Cleaning products" },
  { value: "39400000", label: "39400000 - Kitchen equipment" },
  { value: "39410000", label: "39410000 - Kitchen furniture" },
  { value: "39420000", label: "39420000 - Kitchen utensils" },
  { value: "39430000", label: "39430000 - Kitchen appliances" },
  { value: "39440000", label: "39440000 - Cutlery" },
  { value: "39450000", label: "39450000 - Kitchen containers" },
  { value: "39460000", label: "39460000 - Cooking equipment" },
  { value: "39470000", label: "39470000 - Food preparation equipment" },
  { value: "39480000", label: "39480000 - Baking equipment" },
  { value: "39490000", label: "39490000 - Catering equipment" },
  { value: "30000000", label: "30000000 - Office and computing machinery, equipment and supplies" },
  { value: "31000000", label: "31000000 - Electrical machinery, apparatus, equipment and consumables" },
  { value: "42000000", label: "42000000 - Industrial machinery" },
  { value: "42100000", label: "42100000 - Heating, ventilation and air-conditioning equipment" },
  { value: "42200000", label: "42200000 - Pumps, valves, taps and metal tanks" },
  { value: "42300000", label: "42300000 - Refrigeration equipment" },
  { value: "42400000", label: "42400000 - Food-processing machinery" },
  { value: "42500000", label: "42500000 - Packaging and wrapping machinery" },
  { value: "42600000", label: "42600000 - Machine tools" },
  { value: "42700000", label: "42700000 - Machinery for metallurgy, construction and mining" },
  { value: "42800000", label: "42800000 - Machinery for textiles, apparel and leather production" },
  { value: "42900000", label: "42900000 - Miscellaneous machinery" },
  { value: "55000000", label: "55000000 - Hotel, restaurant and retail trade services" },
  { value: "55100000", label: "55100000 - Hotel services" },
  { value: "55200000", label: "55200000 - Camping sites and other non-hotel accommodation" },
  { value: "55300000", label: "55300000 - Restaurant and food-serving services" },
  { value: "55400000", label: "55400000 - Beverage-serving services" },
  { value: "55500000", label: "55500000 - Canteen and catering services" },
  { value: "55600000", label: "55600000 - Retail trade services" },
  { value: "55700000", label: "55700000 - Retail services in specialized stores" },
  { value: "55800000", label: "55800000 - Retail services in non-specialized stores" },
  { value: "55900000", label: "55900000 - Retail services for various products" },
] as const;

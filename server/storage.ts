import {
  users,
  categories,
  products,
  orders,
  orderItems,
  cartItems,
  reviews,
  suppliers,
  invoices,
  invoiceItems,
  type User,
  type InsertUser,
  type Category,
  type InsertCategory,
  type Product,
  type InsertProduct,
  type ProductWithCategory,
  type Order,
  type InsertOrder,
  type OrderWithItems,
  type OrderItem,
  type InsertOrderItem,
  type CartItem,
  type InsertCartItem,
  type CartItemWithProduct,
  type Review,
  type InsertReview,
  type Supplier,
  type InsertSupplier,
  type Invoice,
  type InsertInvoice,
  type InvoiceItem,
  type InsertInvoiceItem,
  type InvoiceWithItems,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, like, and, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  deleteUser(id: number): Promise<void>;

  // Category operations
  getCategories(): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  getCategoryBySlug(slug: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category>;
  deleteCategory(id: number): Promise<void>;

  // Product operations
  getProducts(options?: { categoryId?: number; featured?: boolean; search?: string; limit?: number; offset?: number }): Promise<ProductWithCategory[]>;
  getProduct(id: number): Promise<ProductWithCategory | undefined>;
  getProductBySlug(slug: string): Promise<ProductWithCategory | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product>;
  updateProductStock(id: number, stockQuantity: number): Promise<Product>;
  deleteProduct(id: number): Promise<void>;

  // Order operations
  getOrders(userId?: number): Promise<OrderWithItems[]>;
  getOrder(id: number): Promise<OrderWithItems | undefined>;
  createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<Order>;
  updateOrder(id: number, order: Partial<InsertOrder>): Promise<Order>;
  updateOrderStatus(id: number, status: string): Promise<Order>;
  acceptOrder(id: number): Promise<Order>;

  // Cart operations
  getCartItems(userId: number): Promise<CartItemWithProduct[]>;
  addToCart(item: InsertCartItem): Promise<CartItem>;
  updateCartItem(id: number, quantity: number): Promise<CartItem>;
  removeFromCart(id: number): Promise<void>;
  clearCart(userId: number): Promise<void>;

  // Review operations
  getProductReviews(productId: number): Promise<Review[]>;
  createReview(review: InsertReview): Promise<Review>;

  // Supplier operations
  getSuppliers(): Promise<Supplier[]>;
  getSupplier(id: number): Promise<Supplier | undefined>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: number, supplier: Partial<InsertSupplier>): Promise<Supplier>;
  deleteSupplier(id: number): Promise<void>;

  // Invoice operations
  getInvoices(userId?: number): Promise<Invoice[]>;
  getInvoice(id: number): Promise<InvoiceWithItems | undefined>;
  getInvoiceByNumber(invoiceNumber: string): Promise<InvoiceWithItems | undefined>;
  createInvoice(invoice: InsertInvoice, items: InsertInvoiceItem[]): Promise<Invoice>;
  updateInvoice(id: number, invoice: Partial<InsertInvoice>): Promise<Invoice>;
  deleteInvoice(id: number): Promise<void>;

  // Admin stats operations
  getTotalUsers(): Promise<number>;
  getTotalOrders(): Promise<number>;
  getTotalProducts(): Promise<number>;
  getRecentOrders(limit: number): Promise<OrderWithItems[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.createdAt);
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ ...user, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Category operations
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories).orderBy(categories.name);
  }

  async getCategory(id: number): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }

  async getCategoryBySlug(slug: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.slug, slug));
    return category;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }

  async updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category> {
    const [updatedCategory] = await db
      .update(categories)
      .set(category)
      .where(eq(categories.id, id))
      .returning();
    return updatedCategory;
  }

  async deleteCategory(id: number): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  // Product operations
  async getProducts(options?: { categoryId?: number; featured?: boolean; search?: string; limit?: number; offset?: number }): Promise<ProductWithCategory[]> {
    // Super minimal query - only essential fields
    const query = db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        price: products.price,
        compareAtPrice: products.compareAtPrice,
        categoryId: products.categoryId,
        supplierId: products.supplierId,
        imageUrl: products.imageUrl,
        images: products.images,
        inStock: products.inStock,
        stockQuantity: products.stockQuantity,
        featured: products.featured,
        rating: products.rating,
        reviewCount: products.reviewCount,
        vatValue: products.vatValue,
        vatPercentage: products.vatPercentage,
        currency: products.currency,
        productCode: products.productCode,
        ncCode: products.ncCode,
        cpvCode: products.cpvCode,
        status: products.status,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        category: {
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
        },
        supplier: {
          id: suppliers.id,
          name: suppliers.name,
          email: suppliers.email,
          phone: suppliers.phone,
          address: suppliers.address,
          city: suppliers.city,
          state: suppliers.state,
          zipCode: suppliers.zipCode,
          country: suppliers.country,
          contactPerson: suppliers.contactPerson,
          apiEndpoint: suppliers.apiEndpoint,
          apiKey: suppliers.apiKey,
          integrationType: suppliers.integrationType,
          notes: suppliers.notes,
          isActive: suppliers.isActive,
          createdAt: suppliers.createdAt,
          updatedAt: suppliers.updatedAt,
        },
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(suppliers, eq(products.supplierId, suppliers.id));

    // Apply filters directly without building conditions array
    if (options?.categoryId) {
      query.where(eq(products.categoryId, options.categoryId));
    }
    if (options?.featured) {
      query.where(eq(products.featured, true));
    }
    if (options?.search) {
      query.where(like(products.name, `%${options.search}%`));
    }

    // Remove ordering for maximum speed
    if (options?.limit) {
      query.limit(options.limit);
    }

    return await query;
  }

  async getProduct(id: number): Promise<ProductWithCategory | undefined> {
    const [product] = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        description: products.description,
        price: products.price,
        compareAtPrice: products.compareAtPrice,
        categoryId: products.categoryId,
        supplierId: products.supplierId,
        imageUrl: products.imageUrl,
        images: products.images,
        inStock: products.inStock,
        stockQuantity: products.stockQuantity,
        featured: products.featured,
        rating: products.rating,
        reviewCount: products.reviewCount,
        vatValue: products.vatValue,
        vatPercentage: products.vatPercentage,
        currency: products.currency,
        productCode: products.productCode,
        ncCode: products.ncCode,
        cpvCode: products.cpvCode,
        status: products.status,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        category: {
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
          description: categories.description,
          imageUrl: categories.imageUrl,
          createdAt: categories.createdAt,
        },
        supplier: {
          id: suppliers.id,
          name: suppliers.name,
          email: suppliers.email,
          phone: suppliers.phone,
          address: suppliers.address,
          city: suppliers.city,
          state: suppliers.state,
          zipCode: suppliers.zipCode,
          country: suppliers.country,
          contactPerson: suppliers.contactPerson,
          apiEndpoint: suppliers.apiEndpoint,
          apiKey: suppliers.apiKey,
          integrationType: suppliers.integrationType,
          notes: suppliers.notes,
          isActive: suppliers.isActive,
          createdAt: suppliers.createdAt,
          updatedAt: suppliers.updatedAt,
        },
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(suppliers, eq(products.supplierId, suppliers.id))
      .where(eq(products.id, id));
    
    return product;
  }

  async getProductBySlug(slug: string): Promise<ProductWithCategory | undefined> {
    const [product] = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        description: products.description,
        price: products.price,
        compareAtPrice: products.compareAtPrice,
        categoryId: products.categoryId,
        supplierId: products.supplierId,
        imageUrl: products.imageUrl,
        images: products.images,
        inStock: products.inStock,
        stockQuantity: products.stockQuantity,
        featured: products.featured,
        rating: products.rating,
        reviewCount: products.reviewCount,
        vatValue: products.vatValue,
        vatPercentage: products.vatPercentage,
        currency: products.currency,
        productCode: products.productCode,
        ncCode: products.ncCode,
        cpvCode: products.cpvCode,
        status: products.status,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        category: {
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
          description: categories.description,
          imageUrl: categories.imageUrl,
          createdAt: categories.createdAt,
        },
        supplier: {
          id: suppliers.id,
          name: suppliers.name,
          email: suppliers.email,
          phone: suppliers.phone,
          address: suppliers.address,
          city: suppliers.city,
          state: suppliers.state,
          zipCode: suppliers.zipCode,
          country: suppliers.country,
          contactPerson: suppliers.contactPerson,
          apiEndpoint: suppliers.apiEndpoint,
          apiKey: suppliers.apiKey,
          integrationType: suppliers.integrationType,
          notes: suppliers.notes,
          isActive: suppliers.isActive,
          createdAt: suppliers.createdAt,
          updatedAt: suppliers.updatedAt,
        },
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(suppliers, eq(products.supplierId, suppliers.id))
      .where(eq(products.slug, slug));
    
    return product;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  async updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product> {
    const [updatedProduct] = await db
      .update(products)
      .set({ ...product, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return updatedProduct;
  }

  async updateProductStock(id: number, stockQuantity: number): Promise<Product> {
    const [updatedProduct] = await db
      .update(products)
      .set({ stockQuantity, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return updatedProduct;
  }

  async deleteProduct(id: number): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  // Order operations
  async getOrders(userId?: number): Promise<OrderWithItems[]> {
    const query = db
      .select({
        id: orders.id,
        userId: orders.userId,
        status: orders.status,
        totalAmount: orders.totalAmount,
        shippingAddress: orders.shippingAddress,
        billingAddress: orders.billingAddress,
        paymentMethod: orders.paymentMethod,
        paymentStatus: orders.paymentStatus,
        notes: orders.notes,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        items: sql`
          COALESCE(
            json_agg(
              json_build_object(
                'id', ${orderItems.id},
                'orderId', ${orderItems.orderId},
                'productId', ${orderItems.productId},
                'quantity', ${orderItems.quantity},
                'price', ${orderItems.price},
                'totalPrice', ${orderItems.totalPrice},
                'product', json_build_object(
                  'id', ${products.id},
                  'name', ${products.name},
                  'slug', ${products.slug},
                  'imageUrl', ${products.imageUrl}
                )
              )
            ) FILTER (WHERE ${orderItems.id} IS NOT NULL),
            '[]'
          )
        `.as('items'),
      })
      .from(orders)
      .leftJoin(orderItems, eq(orders.id, orderItems.orderId))
      .leftJoin(products, eq(orderItems.productId, products.id))
      .groupBy(orders.id)
      .orderBy(desc(orders.createdAt));

    if (userId) {
      query.where(eq(orders.userId, userId));
    }

    const results = await query;
    return results as OrderWithItems[];
  }

  async getOrder(id: number): Promise<OrderWithItems | undefined> {
    const [order] = await db
      .select({
        id: orders.id,
        userId: orders.userId,
        status: orders.status,
        totalAmount: orders.totalAmount,
        shippingAddress: orders.shippingAddress,
        billingAddress: orders.billingAddress,
        paymentMethod: orders.paymentMethod,
        paymentStatus: orders.paymentStatus,
        notes: orders.notes,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        items: sql`
          COALESCE(
            json_agg(
              json_build_object(
                'id', ${orderItems.id},
                'orderId', ${orderItems.orderId},
                'productId', ${orderItems.productId},
                'quantity', ${orderItems.quantity},
                'price', ${orderItems.price},
                'totalPrice', ${orderItems.totalPrice},
                'product', json_build_object(
                  'id', ${products.id},
                  'name', ${products.name},
                  'slug', ${products.slug},
                  'imageUrl', ${products.imageUrl}
                )
              )
            ) FILTER (WHERE ${orderItems.id} IS NOT NULL),
            '[]'
          )
        `.as('items'),
      })
      .from(orders)
      .leftJoin(orderItems, eq(orders.id, orderItems.orderId))
      .leftJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orders.id, id))
      .groupBy(orders.id);

    return order as OrderWithItems | undefined;
  }

  async createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<Order> {
    const [newOrder] = await db.insert(orders).values(order).returning();
    
    const orderItemsWithOrderId = items.map(item => ({
      ...item,
      orderId: newOrder.id,
    }));
    
    await db.insert(orderItems).values(orderItemsWithOrderId);
    
    return newOrder;
  }

  async updateOrder(id: number, order: Partial<InsertOrder>): Promise<Order> {
    const [updatedOrder] = await db
      .update(orders)
      .set({ ...order, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return updatedOrder;
  }

  async updateOrderStatus(id: number, status: string): Promise<Order> {
    const [updatedOrder] = await db
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return updatedOrder;
  }

  async acceptOrder(id: number): Promise<Order> {
    const [updatedOrder] = await db
      .update(orders)
      .set({ status: 'accepted', updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return updatedOrder;
  }

  // Cart operations
  async getCartItems(userId: number): Promise<CartItemWithProduct[]> {
    const results = await db
      .select({
        id: cartItems.id,
        userId: cartItems.userId,
        productId: cartItems.productId,
        quantity: cartItems.quantity,
        createdAt: cartItems.createdAt,
        product: products,
      })
      .from(cartItems)
      .innerJoin(products, eq(cartItems.productId, products.id))
      .where(eq(cartItems.userId, userId));
    
    return results as CartItemWithProduct[];
  }

  async addToCart(item: InsertCartItem): Promise<CartItem> {
    // Check if item already exists in cart
    const [existingItem] = await db
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.userId, item.userId!), eq(cartItems.productId, item.productId!)));

    if (existingItem) {
      // Update quantity if item exists
      const [updatedItem] = await db
        .update(cartItems)
        .set({ quantity: existingItem.quantity + item.quantity })
        .where(eq(cartItems.id, existingItem.id))
        .returning();
      return updatedItem;
    } else {
      // Create new item
      const [newItem] = await db.insert(cartItems).values(item).returning();
      return newItem;
    }
  }

  async updateCartItem(id: number, quantity: number): Promise<CartItem> {
    const [updatedItem] = await db
      .update(cartItems)
      .set({ quantity })
      .where(eq(cartItems.id, id))
      .returning();
    return updatedItem;
  }

  async removeFromCart(id: number): Promise<void> {
    await db.delete(cartItems).where(eq(cartItems.id, id));
  }

  async clearCart(userId: number): Promise<void> {
    await db.delete(cartItems).where(eq(cartItems.userId, userId));
  }

  // Review operations
  async getProductReviews(productId: number): Promise<Review[]> {
    return await db
      .select()
      .from(reviews)
      .where(eq(reviews.productId, productId))
      .orderBy(desc(reviews.createdAt));
  }

  async createReview(review: InsertReview): Promise<Review> {
    const [newReview] = await db.insert(reviews).values(review).returning();
    
    // Update product rating and review count
    const productReviews = await this.getProductReviews(review.productId!);
    const averageRating = productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length;
    
    await db
      .update(products)
      .set({ 
        rating: averageRating.toFixed(2),
        reviewCount: productReviews.length,
        updatedAt: new Date()
      })
      .where(eq(products.id, review.productId!));
    
    return newReview;
  }

  // Supplier operations
  async getSuppliers(): Promise<Supplier[]> {
    return await db.select().from(suppliers).orderBy(suppliers.name);
  }

  async getSupplier(id: number): Promise<Supplier | undefined> {
    const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, id));
    return supplier;
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    const [newSupplier] = await db.insert(suppliers).values(supplier).returning();
    return newSupplier;
  }

  async updateSupplier(id: number, supplier: Partial<InsertSupplier>): Promise<Supplier> {
    const [updatedSupplier] = await db
      .update(suppliers)
      .set({ ...supplier, updatedAt: new Date() })
      .where(eq(suppliers.id, id))
      .returning();
    return updatedSupplier;
  }

  async deleteSupplier(id: number): Promise<void> {
    await db.delete(suppliers).where(eq(suppliers.id, id));
  }

  // Invoice operations
  async getInvoices(userId?: number): Promise<Invoice[]> {
    if (userId) {
      return await db.select().from(invoices).where(eq(invoices.userId, userId)).orderBy(desc(invoices.createdAt));
    }
    return await db.select().from(invoices).orderBy(desc(invoices.createdAt));
  }

  async getInvoice(id: number): Promise<InvoiceWithItems | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    if (!invoice) return undefined;

    // Get user data
    const [user] = await db.select().from(users).where(eq(users.id, invoice.userId));
    if (!user) return undefined;

    // Get invoice items
    const items = await db.select({
      id: invoiceItems.id,
      invoiceId: invoiceItems.invoiceId,
      productId: invoiceItems.productId,
      productName: invoiceItems.productName,
      productCode: invoiceItems.productCode,
      quantity: invoiceItems.quantity,
      unitPrice: invoiceItems.unitPrice,
      vatRate: invoiceItems.vatRate,
      lineTotal: invoiceItems.lineTotal,
    }).from(invoiceItems).where(eq(invoiceItems.invoiceId, id));

    return {
      ...invoice,
      user,
      items,
    };
  }

  async getInvoiceByNumber(invoiceNumber: string): Promise<InvoiceWithItems | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.invoiceNumber, invoiceNumber));
    if (!invoice) return undefined;

    // Get user data
    const [user] = await db.select().from(users).where(eq(users.id, invoice.userId));
    if (!user) return undefined;

    // Get invoice items
    const items = await db.select({
      id: invoiceItems.id,
      invoiceId: invoiceItems.invoiceId,
      productId: invoiceItems.productId,
      productName: invoiceItems.productName,
      productCode: invoiceItems.productCode,
      quantity: invoiceItems.quantity,
      unitPrice: invoiceItems.unitPrice,
      vatRate: invoiceItems.vatRate,
      lineTotal: invoiceItems.lineTotal,
    }).from(invoiceItems).where(eq(invoiceItems.invoiceId, invoice.id));

    return {
      ...invoice,
      user,
      items,
    };
  }

  async createInvoice(invoice: InsertInvoice, items: InsertInvoiceItem[]): Promise<Invoice> {
    // Create the invoice
    const [newInvoice] = await db.insert(invoices).values(invoice).returning();
    
    // Create invoice items with the invoice ID
    const itemsWithInvoiceId = items.map(item => ({
      ...item,
      invoiceId: newInvoice.id,
    }));
    
    await db.insert(invoiceItems).values(itemsWithInvoiceId);
    
    return newInvoice;
  }

  async updateInvoice(id: number, invoice: Partial<InsertInvoice>): Promise<Invoice> {
    const [updatedInvoice] = await db
      .update(invoices)
      .set(invoice)
      .where(eq(invoices.id, id))
      .returning();
    return updatedInvoice;
  }

  async deleteInvoice(id: number): Promise<void> {
    // Delete invoice items first
    await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));
    // Delete the invoice
    await db.delete(invoices).where(eq(invoices.id, id));
  }

  // Admin stats operations
  async getTotalUsers(): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)` }).from(users);
    return result.count;
  }

  async getTotalOrders(): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)` }).from(orders);
    return result.count;
  }

  async getTotalProducts(): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)` }).from(products);
    return result.count;
  }

  async getRecentOrders(limit: number): Promise<OrderWithItems[]> {
    const ordersWithItems = await db.select({
      id: orders.id,
      userId: orders.userId,
      status: orders.status,
      totalAmount: orders.totalAmount,
      shippingAddress: orders.shippingAddress,
      billingAddress: orders.billingAddress,
      paymentMethod: orders.paymentMethod,
      paymentStatus: orders.paymentStatus,
      notes: orders.notes,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
    }).from(orders)
      .orderBy(desc(orders.createdAt))
      .limit(limit);

    const result: OrderWithItems[] = [];
    for (const order of ordersWithItems) {
      const items = await db.select({
        id: orderItems.id,
        orderId: orderItems.orderId,
        productId: orderItems.productId,
        quantity: orderItems.quantity,
        price: orderItems.price,
        totalPrice: orderItems.totalPrice,
        product: {
          id: products.id,
          name: products.name,
          slug: products.slug,
          description: products.description,
          price: products.price,
          compareAtPrice: products.compareAtPrice,
          categoryId: products.categoryId,
          imageUrl: products.imageUrl,
          images: products.images,
          inStock: products.inStock,
          stockQuantity: products.stockQuantity,
          featured: products.featured,
          rating: products.rating,
          reviewCount: products.reviewCount,
          createdAt: products.createdAt,
          updatedAt: products.updatedAt,
        }
      }).from(orderItems)
        .innerJoin(products, eq(orderItems.productId, products.id))
        .where(eq(orderItems.orderId, order.id));

      result.push({
        ...order,
        items: items.map(item => ({
          id: item.id,
          orderId: item.orderId,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          totalPrice: item.totalPrice,
          product: item.product
        }))
      });
    }

    return result;
  }
}

export const storage = new DatabaseStorage();

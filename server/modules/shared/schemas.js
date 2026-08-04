
import { z } from "zod";

export const credentialsSchema = z.object({
  email: z.string().trim().email().max(120).transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
});

export const registerSchema = credentialsSchema.extend({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(7).max(20).optional(),
});

export const orderSchema = z.object({
  items: z.array(z.object({
    productId: z.coerce.number().int().positive(),
    quantity: z.coerce.number().int().min(1).max(10),
  })).min(1).max(50),
  customer: z.object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().email().max(120),
    phone: z.string().trim().min(7).max(20),
    address: z.string().trim().min(5).max(200),
    city: z.string().trim().min(2).max(60),
    state: z.string().trim().max(60).optional(),
    postcode: z.string().trim().min(3).max(20),
    country: z.string().trim().max(60).default("Bangladesh"),
  }),
  currency: z.enum(["BDT", "USD"]).default("BDT"),
  paymentMethod: z.enum(["cash_on_delivery", "bank_transfer"]).default("cash_on_delivery"),
});

export const productSchema = z.object({
  sku: z.string().trim().min(2).max(64),
  name: z.string().trim().min(2).max(140),
  category: z.string().trim().min(2).max(80),
  subcategory: z.string().trim().min(2).max(80).nullable().optional(),
  brand: z.string().trim().min(2).max(80).nullable().optional(),
  description: z.string().trim().min(5).max(1000),
  price: z.coerce.number().positive(),
  oldPrice: z.coerce.number().positive().nullable().optional(),
  currency: z.enum(["BDT", "USD"]).default("BDT"),
  stock: z.coerce.number().int().min(0),
  availability: z.enum(["in_stock", "preorder"]).default("in_stock"),
  image: z.string().trim().min(1).max(500),
  sourceName: z.string().trim().min(2).max(80).nullable().optional(),
  sourceUrl: z.string().url().max(500).nullable().optional(),
  active: z.coerce.boolean().default(true),
  featured: z.coerce.boolean().default(false),
});

export const addressSchema = z.object({
  label: z.string().trim().min(2).max(40),
  recipientName: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(7).max(20),
  addressLine: z.string().trim().min(5).max(180),
  city: z.string().trim().min(2).max(60),
  postcode: z.string().trim().min(3).max(20),
  isDefault: z.coerce.boolean().default(false),
});

export const couponSchema = z.object({
  code: z.string().trim().min(3).max(32).transform((value) => value.toUpperCase()),
  discountType: z.enum(["percent", "fixed"]),
  discountValue: z.coerce.number().positive(),
  minimumOrder: z.coerce.number().min(0).default(0),
  usageLimit: z.coerce.number().int().positive().nullable().optional(),
  startsAt: z.string().datetime().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  active: z.coerce.boolean().default(true),
});

export const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().min(3).max(80),
  body: z.string().trim().min(10).max(600),
});

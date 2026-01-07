import { z } from 'zod';
import { createZodDto } from '@anatine/zod-nestjs';
import { AnswerFor } from '@prisma/client';

// Brand
export const Brand = z.object({
  id: z.string().min(2).optional(),
  name: z.string().min(2),
  domain: z.array(z.string().min(2)).min(1),
  business_location: z.string().min(3),
});
export type BrandT = z.infer<typeof Brand>;

// Category
export const Category = z.object({
  name: z.string().min(2),
  id: z.string().min(2).optional(),
});
export type CategoryT = z.infer<typeof Category>;
// Tool
export const Tool = z.object({
  id: z.string().min(2).optional(),
  name: z.string().min(2),
});

//Financials
export const Revenue = z.object({
  id: z.string().min(2).optional(),
  type: z.enum(['monthly', 'yearly']),
  name: z.string().min(3),
  revenue_amount: z.string().min(1),
  annual_cost: z.string().min(1),
  net_profit: z.string().min(1),
});

// Statistics

export const Channel = z.object({
  id: z.string().min(2).optional(),
  name: z.string().min(2),
  percentage: z.string().min(2),
});

export const Statistics = z.object({
  id: z.string().min(2).optional(),
  conversion_rate: z.string().min(2).optional(),
  customer_base: z.string().min(2),
  average_order_value: z.string().min(2).optional(),
  returning_customer: z.string().min(2).optional(),
  email_subscribers: z.array(z.string().min(2)).optional(),

  refund_rate: z.array(z.string().min(2)),

  sales_channel: z.array(Channel),
  adverstising_channel: z.array(Channel),
  sales_countries: z.array(Channel),
});

// Question
export const Question = z.object({
  id: z.string().min(2).optional(),
  question: z.string().min(2).optional(),
  answer_for: z.enum(['BRAND', 'PRODUCT', 'MANAGEMENT', 'HANDOVER', 'STATISTIC', 'ADVERTISMENT', 'SOCIAL']),
  answer_type: z.enum(['TEXT', 'SELECT', 'BOOLEAN', 'NUMBER', 'FILE','PHOTO']).optional(),
  answer: z.string().min(2).optional(),
  option: z.array(z.string().min(2)).optional(),
});








//Listing
export const listingSchema = z.object({
  status: z.enum(['PUBLISH', 'DRAFT']),
  brand: z.array(Question),
  category: z.array(Category),
  tools: z.array(Tool),
  financials: z.array(Revenue),
  statistics: z.array(Question),
  productQuestion: z.array(Question),
  managementQuestion: z.array(Question),
  social_account: z.array(Question),
  advertisement: z.array(Question),
  handover: z.array(Question),
  portfolioLink: z.string().optional(),
  managed_by_ex: z.boolean().optional()
});

export type ListingSchemaT = z.infer<typeof listingSchema>;
export class ListingSchemaDTO extends createZodDto(listingSchema) {}

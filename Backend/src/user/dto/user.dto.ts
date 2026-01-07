import { z } from 'zod';
import { RoleEnum } from 'common/enum/role.enum';
import { createZodDto } from '@anatine/zod-nestjs';

export const UserSchema = z.object({
  first_name: z.string().min(4),
  last_name: z.string().min(4),
  role: RoleEnum,

  business_name: z.string().optional().nullable(),
  contact_name: z.string().optional(),

  email: z.string().email(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  permissions: z.array(z.string()).optional(),
  state: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  zip_code: z.string().optional(),
  background: z.string().optional(),
  profile_pic: z.string().optional().nullable(),
  is_online: z.boolean().default(false),
  password_hash: z.string(),

  refresh_token: z.string().optional().nullable(),

  otp_code: z.string().optional(),

  verified: z.boolean().default(false),
  is_email_verified: z.boolean().default(false),
  is_phone_verified: z.boolean().default(false),
});

export type UserType = z.infer<typeof UserSchema>;
export class UserSchemaDTO extends createZodDto(UserSchema) {}

export const UserUpdateSchema = UserSchema.partial();
export type UpdateUserType = z.infer<typeof UserUpdateSchema>;
export class UserUpdateSchemaDTO extends createZodDto(UserUpdateSchema) {}

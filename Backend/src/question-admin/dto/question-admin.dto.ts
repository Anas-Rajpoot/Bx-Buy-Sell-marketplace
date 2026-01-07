import * as z from 'zod';
import { createZodDto } from '@anatine/zod-nestjs';

export const QuestionAdminSchema = z.object({
  question: z.string().min(4),
  answer_type: z.enum(['TEXT', 'NUMBER', 'BOOLEAN', 'SELECT', 'DATE', 'FILE', 'PHOTO', 'URL']),
  answer_for: z.enum(['BRAND', 'PRODUCT', 'MANAGEMENT', 'HANDOVER', 'STATISTIC', 'ADVERTISMENT', 'SOCIAL']),
  options: z.array(z.string()).optional(),
});
export type QuestionAdminT = z.infer<typeof QuestionAdminSchema>;
export class QuestionAdminDto extends createZodDto(QuestionAdminSchema) {}


// Update schema - all fields optional, but enum validation still applies
export const UpdateQuestionAdminSchema = z.object({
  question: z.string().min(4).optional(),
  answer_type: z.enum(['TEXT', 'NUMBER', 'BOOLEAN', 'SELECT', 'DATE', 'FILE', 'PHOTO', 'URL']).optional(),
  answer_for: z.enum(['BRAND', 'PRODUCT', 'MANAGEMENT', 'HANDOVER', 'STATISTIC', 'ADVERTISMENT', 'SOCIAL']).optional(),
  options: z.array(z.string()).optional(),
});
export type UpdateQuestionAdminT = z.infer<typeof UpdateQuestionAdminSchema>;
export class UpdateQuestionAdminDto extends createZodDto(UpdateQuestionAdminSchema) {}
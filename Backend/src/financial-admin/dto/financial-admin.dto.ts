import { createZodDto } from '@anatine/zod-nestjs'
import * as z from 'zod'

export const FinancialAdminSchema = z.object({
    columns: z.array(z.string()).optional(),
    rows: z.array(z.array(z.string())).optional()      
})

export type FinancialAdminSchemaT = z.infer<typeof FinancialAdminSchema>
export class FinancialAdminDTO  extends createZodDto(FinancialAdminSchema) {}
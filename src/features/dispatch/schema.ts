import { z } from 'zod';

export const sclSchema = z.object({
  customer_id: z.string().min(1, "Customer is required"),
  asset_id: z.string().min(1, "Asset is required"),
  assigned_employee_id: z.string().min(1, "Technician is required"),
  status: z.enum(['Open', 'In Progress', 'Closed']),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']),
  doc_no: z.string().min(1, "Document number is required"),
  do_number: z.string().optional(),
  narration: z.string().min(1, "Narration is required"),
});

export type SclSchema = z.infer<typeof sclSchema>;

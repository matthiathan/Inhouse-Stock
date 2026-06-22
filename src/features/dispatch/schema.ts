import { z } from 'zod';

export const sclSchema = z.object({
  doc_no: z.string().min(1, 'Doc No is required'),
  // Make DO number optional and allow it to be empty/null
  do_number: z.string().optional().nullable(),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']),
  current_status: z.enum(['Open', 'In Progress', 'Resolved', 'Closed']),
  
  // Restrict to your specific service types
  service_type: z.enum([
    'Maintenance', 
    'Upliftment', 
    'Installation', 
    'Collections', 
    'Deliveries', 
    'Complaint'
  ]),
  
  sub_task: z.string().optional(),
  narration: z.string().min(1, 'Narration is required'),
  customer_id: z.string().min(1, 'Customer is required'),
  assigned_employee_id: z.string().min(1, 'Technician is required'),
  serial_number: z.string().optional(),
  qrcode: z.string().optional()
});

export type SCLFormData = z.infer<typeof sclSchema>;

import { z } from 'zod';

export const sclSchema = z.object({
  doc_no: z.string().min(1, 'Doc No is required'),
  do_number: z.string().min(1, 'DO Number is required'),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical'], {
    errorMap: () => ({ message: 'Priority must be Low, Medium, High, or Critical' })
  }),
  current_status: z.enum(['Open', 'In Progress', 'Closed'], {
    errorMap: () => ({ message: 'Status must be Open, In Progress, or Closed' })
  }),
  service_type: z.enum(['Maintenance', 'Installation', 'Repair'], {
    errorMap: () => ({ message: 'Service type must be Maintenance, Installation, or Repair' })
  }),
  sub_task: z.string().min(1, 'Sub task is required'),
  customer_id: z.string().min(1, 'Customer selection is required'),
  assigned_employee_id: z.string().min(1, 'Technician assignment is required'),
  serial_number: z.string().min(1, 'Serial number selection is required'),
  qrcode: z.string().min(1, 'QR Code selection is required'),
  narration: z.string().min(1, 'Narration/Issue is required'),
});

export type SclSchemaValue = z.infer<typeof sclSchema>;

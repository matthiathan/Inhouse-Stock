import { z } from 'zod';

export const receiveStockSchema = z.object({
  item: z.string().min(1, "Item description is required"),
  barcode: z.string().min(1, "Barcode is required"),
  palletQty: z.number().min(0, "Pallet quantity must be 0 or greater"),
  boxes: z.number().min(0, "Box quantity must be 0 or greater"),
  unitsPerBox: z.number().min(1, "Units per box must be at least 1"),
  notes: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
});

export type ReceiveStockSchema = z.infer<typeof receiveStockSchema>;

export const createOrderSchema = z.object({
    orderNumber: z.string().min(1, "Order number is required"),
    deliveryDate: z.string().min(1, "Delivery date is required"),
    lineItems: z.array(z.object({
        stockId: z.string().min(1, "Stock ID is required"),
        requiredQty: z.coerce.number().min(1, "Quantity must be at least 1")
    })).min(1, "At least one item is required")
});

export type CreateOrderSchema = z.infer<typeof createOrderSchema>;

// Additional Zod Validation requested

export const machineSchema = z.object({
  serial_number: z.string().min(1, "Serial number is required"),
  qr_code: z.string().min(1, "QR code is required"),
  asset_name: z.string().min(1, "Asset name is required"),
  section: z.string().min(1, "Location/Section is required"),
  status: z.enum(['Active', 'Inactive', 'Maintenance', 'Defective', 'Retired']).default('Active'),
  category: z.string().optional(),
  photo_url: z.string().url().optional().or(z.literal(''))
});

export type MachineSchemaValue = z.infer<typeof machineSchema>;

export const userProfileSchema = z.object({
  id: z.string().uuid().optional().or(z.string().min(1)),
  email: z.string().email("Invalid email format"),
  full_name: z.string().min(1, "Full name is required").optional(),
  role: z.enum(['admin', 'ops_manager', 'warehouse', 'warehouse_staff', 'driver', 'tech', 'road_tech', 'finance', 'user']),
  can_update_location: z.boolean().default(true),
});

export type UserProfileSchemaValue = z.infer<typeof userProfileSchema>;

export const customerSchema = z.object({
  code: z.string().min(1, "Customer code is required"),
  name: z.string().min(1, "Customer name is required"),
  address: z.string().min(1, "Street address is required"),
  contact_number: z.string().optional(),
});

export type CustomerSchemaValue = z.infer<typeof customerSchema>;

export const serviceCallLogSchema = z.object({
  doc_no: z.string().min(1, "Doc No is required"),
  do_number: z.string().min(1, "DO Number is required"),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']),
  current_status: z.enum(['Open', 'In Progress', 'Closed']),
  service_type: z.enum(['Maintenance', 'Installation', 'Repair']),
  sub_task: z.string().min(1, "Sub task is required"),
  customer_id: z.string().min(1, "Customer selection is required"),
  assigned_employee_id: z.string().min(1, "Technician assignment is required"),
  serial_number: z.string().min(1, "Serial number selection is required"),
  qrcode: z.string().min(1, "QR Code selection is required"),
  narration: z.string().min(1, "Narration/Issue description is required"),
});

export type ServiceCallLogSchemaValue = z.infer<typeof serviceCallLogSchema>;

// Database schema definitions for repository writes
export const dbOrderSchema = z.object({
  order_number: z.string().min(1, "Order number is required"),
  delivery_date: z.string().min(1, "Delivery date is required"),
  status: z.enum(['Pending', 'Fulfilled', 'Cancelled']).default('Pending'),
});

export type DbOrderSchemaValue = z.infer<typeof dbOrderSchema>;

export const dbOrderItemSchema = z.object({
  order_id: z.string().uuid("Invalid order ID format").or(z.string().min(1, "Order ID is required")),
  stock_barcode: z.string().min(1, "Stock barcode is required"),
  item_name: z.string().min(1, "Item name is required"),
  required_quantity: z.number().min(0, "Required quantity must be 0 or greater"),
  scanned_quantity: z.number().min(0, "Scanned quantity must be 0 or greater").default(0),
  is_fulfilled: z.boolean().default(false)
});

export type DbOrderItemSchemaValue = z.infer<typeof dbOrderItemSchema>;

// Custom validation error class for repository operations
export class RepositoryValidationError extends Error {
  public details?: any;
  constructor(message: string, details?: any) {
    super(message);
    this.name = 'RepositoryValidationError';
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

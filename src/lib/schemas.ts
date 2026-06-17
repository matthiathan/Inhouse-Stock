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

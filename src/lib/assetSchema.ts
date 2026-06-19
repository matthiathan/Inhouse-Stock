import { z } from 'zod';

/**
 * Strict validation schema for a new Asset/Machine
 */
export const assetSchema = z.object({
  serial_number: z.string()
    .min(5, "Serial number must be at least 5 characters")
    .trim(),
  qr_code: z.string().optional().or(z.literal('')),
  machine_model: z.string().min(1, "Machine model is required").trim(),
  installation_date: z.string()
    .min(1, "Installation date is required")
    .refine((date) => {
      const selectedDate = new Date(date);
      const today = new Date();
      // Set hours to 0 to compare dates only
      today.setHours(0, 0, 0, 0);
      return selectedDate <= today;
    }, "Installation date cannot be in the future")
});

export type AssetFormData = z.infer<typeof assetSchema>;

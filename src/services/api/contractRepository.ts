import { supabase } from '../../lib/supabase';
import { Region } from '../../types';

export const contractRepository = {
  /**
   * Fetch distinct customer names for the dropdown directly from regional contract tables.
   * This ensures we see customers that might not be in the unified view yet.
   */
  async getContractCustomers(region: Region) {
    const table = `${region.toLowerCase()}_contracts`;
    
    // We select only the customer_name column.
    // We use double quotes if there are special characters or specific casing requirements.
    const { data, error } = await supabase
      .from(table)
      .select('"customer_name"')
      .not('"customer_name"', 'is', null);

    if (error) throw error;
    
    if (!data) return [];

    // Remove duplicates (in case one customer has multiple contracts)
    const uniqueCustomers = Array.from(new Set(data.map((c: any) => c.customer_name)))
      .filter((name): name is string => typeof name === 'string' && name.length > 0)
      .sort((a, b) => a.localeCompare(b));
      
    return uniqueCustomers;
  }
};


import { supabase } from '../../lib/supabase';

export const customerRepository = {
  // Fetch from the new View instead of hardcoded tables
  async getAllCustomers() {
    const { data, error } = await supabase
      .from('vw_customers_combined')
      .select('*');
      
    if (error) throw error;
    return data;
  },

  async getCustomersByRegion(region: 'KZN' | 'JHB' | 'CPT') {
    const { data, error } = await supabase
      .from('vw_customers_combined')
      .select('*')
      .eq('region', region);
      
    if (error) throw error;
    return data;
  },

  async searchCustomers(term: string) {
    const { data, error } = await supabase
      .from('vw_customers_combined')
      .select('*')
      .ilike('name', `%${term}%`); // Case-insensitive search across all regions
      
    if (error) throw error;
    return data;
  }
};


import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

export interface SupabaseCustomerRow {
    id: string;
    "A/C Code": string | null;
    "Name": string | null;
    "Address": string | null;
    "Region": string | null;
    "latitude": number | null;
    "longitude": number | null;
    "created_at": string | null;
    "code": string | null; // some tables might use code instead of A/C Code
}

export const useCustomers = () => {
    return useQuery({
        queryKey: ['customers'],
        queryFn: async (): Promise<any[]> => {
            const { data, error } = await supabase
                .from('customers')
                // 2. Write a Supabase .select() query that explicitly requests exact string names
                .select(`
                    id,
                    "A/C Code",
                    "Name",
                    "Address",
                    "Region",
                    "latitude",
                    "longitude",
                    "created_at",
                    "code",
                    "name",
                    "address",
                    "region"
                `);
                // Note: we request both the spaced names and lowercase names in case the schema has both

            if (error) {
                console.error("Error fetching customers:", error);
                throw error;
            }

            // 3. Transformation layer inside the queryFn to sanitize this data
            return (data || []).map((row: any) => {
                const code = row["A/C Code"] || row["code"] || "N/A";
                const name = row["Name"] || row["name"] || "N/A";
                const address = row["Address"] || row["address"] || "N/A";
                const region = row["Region"] || row["region"] || "N/A";
                
                return {
                    id: row.id || "N/A",
                    code: code,
                    name: name,
                    address: address,
                    region: region,
                    latitude: typeof row.latitude === 'number' && row.latitude !== null ? row.latitude : 0,
                    longitude: typeof row.longitude === 'number' && row.longitude !== null ? row.longitude : 0,
                    created_at: row.created_at || "N/A",
                    "A/C Code": code,
                    "Name": name,
                    "Address": address,
                    "Region": region,
                    details: {}
                };
            });
        },
    });
};

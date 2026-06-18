import { BaseRepository } from '../../services/api/baseRepository';
import { User } from '../../types';
import { supabase } from '../../lib/supabase';

export class UserRepository extends BaseRepository<User> {
    constructor() {
        super('users');
    }

    async getTechnicians(): Promise<User[] | null> {
        const { data, error } = await supabase
            .from(this.tableName)
            .select('*')
            .in('role', ['tech', 'road_tech']);
        
        if (error) throw error;
        return data as User[];
    }
}

export const userRepository = new UserRepository();

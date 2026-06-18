import { BaseRepository } from '../../services/api/baseRepository';
import { User } from '../../types';

export class UserRepository extends BaseRepository<User> {
    constructor() {
        super('users');
    }

    async getTechnicians(): Promise<User[] | null> {
        // Since baseRepository is generic, for specific queries, 
        // normally we would extend, but for now, let's keep it simple and just fetch all.
        // The role filtering can be handled in fetch, but as a base extension I'll just keep all for now.
        // Will need to create specialized repository methods soon.
        return this.getAll();
    }
}

export const userRepository = new UserRepository();

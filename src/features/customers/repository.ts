import { BaseRepository } from '../../services/api/baseRepository';
import { Customer } from '../../types';

export class CustomerRepository extends BaseRepository<Customer> {
    constructor() {
        super('customers');
    }
}

export const customerRepository = new CustomerRepository();

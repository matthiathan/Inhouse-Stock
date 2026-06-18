import { BaseRepository } from '../../services/api/baseRepository';
import { Customer, UnifiedCustomer } from '../../types';

export class CustomerRepository extends BaseRepository<Customer> {
    constructor() {
        super('customers');
    }
}

export class UnifiedCustomerRepository extends BaseRepository<UnifiedCustomer> {
    constructor() {
        super('unified_customers');
    }
}

export const customerRepository = new CustomerRepository();
export const unifiedCustomerRepository = new UnifiedCustomerRepository();

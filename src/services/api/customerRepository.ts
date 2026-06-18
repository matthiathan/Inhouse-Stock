
import { BaseRepository } from './baseRepository';
import { Customer } from '../../types';

export class CustomerRepository extends BaseRepository<Customer> {
  constructor() {
    super('customers');
  }
}

export const customerRepository = new CustomerRepository();

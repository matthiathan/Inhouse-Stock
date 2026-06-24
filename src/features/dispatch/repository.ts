import { BaseRepository } from '../../services/api/baseRepository';
import { ServiceCallLog } from '../../types';

export class SclRepository extends BaseRepository<ServiceCallLog> {
  constructor() {
    super('service_call_logs');
  }
}

export const sclRepository = new SclRepository();

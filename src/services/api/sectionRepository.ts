import { BaseRepository } from './baseRepository';
import { Section } from '../../types';

export class SectionRepository extends BaseRepository<Section> {
  constructor() {
    super('section');
  }
}

export const sectionRepository = new SectionRepository();

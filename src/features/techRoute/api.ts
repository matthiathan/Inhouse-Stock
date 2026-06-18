import { routeService } from '../../services/routeService';
import { ticketRepository } from '../tickets/repository';
import { MaintenanceTicket } from '../../types';

export const fetchTechTasks = async (techId: string) => {
  return routeService.calculateRouteSequence(techId);
};

export const updateTaskStatus = async ({ id, status }: { id: string; status: string }) => {
    await ticketRepository.update(id, { status });
};

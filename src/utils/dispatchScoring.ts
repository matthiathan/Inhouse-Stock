import { User, Customer, MaintenanceTicket } from '../types';

export const calculateTechnicianScore = (
  technician: User,
  customer: Customer,
  openTickets: MaintenanceTicket[]
) => {
  // 1. Distance score (simple Euclidean distance for now)
  const dLat = technician.latitude - customer.latitude;
  const dLon = technician.longitude - customer.longitude;
  const distance = Math.sqrt(dLat * dLat + dLon * dLon);
  const distanceScore = Math.max(0, 100 - distance * 10); // Closer is better

  // 2. Workload score
  const techOpenTickets = openTickets.filter((t) => t.tech_id === technician.id).length;
  const workloadScore = Math.max(0, 100 - techOpenTickets * 20); // Fewer tickets is better

  // Weighted score (e.g., 60% distance, 40% workload)
  return distanceScore * 0.6 + workloadScore * 0.4;
};

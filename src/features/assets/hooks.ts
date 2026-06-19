import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assetRepository } from '../../services/api/assetRepository';
import { sectionRepository } from '../../services/api/sectionRepository';
import { Machine } from '../../types';

export const useAssets = (sectionName?: string) => {
  return useQuery({
    queryKey: ['assets', sectionName || 'all'],
    queryFn: async () => {
      const filtered = await assetRepository.getAll(sectionName);
      return filtered || [];
    }
  });
};

export const useAssetById = (id: string) => {
  return useQuery({
    queryKey: ['asset', id],
    queryFn: () => assetRepository.getById(id),
    enabled: !!id
  });
};

export const useAssetByQrCode = (qrCode: string | null) => {
  return useQuery({
    queryKey: ['asset', 'qr', qrCode],
    queryFn: () => qrCode ? assetRepository.getByQrCode(qrCode) : null,
    enabled: !!qrCode
  });
};

export const useSections = () => {
  return useQuery({
    queryKey: ['sections'],
    queryFn: async () => {
      const sections = await sectionRepository.getAll();
      return sections || [];
    }
  });
};

export const useMachineModels = () => {
  return useQuery({
    queryKey: ['machineModels'],
    queryFn: () => assetRepository.getMachineModels()
  });
};

export const useUpdateAssetSection = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, sectionName }: { id: string; sectionName: string }) =>
      assetRepository.updateSection(id, sectionName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['asset'] });
    }
  });
};

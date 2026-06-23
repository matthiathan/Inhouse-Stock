import React, { useState } from 'react';
import { toast } from 'sonner';
import { useMoveMachine } from '../../hooks/useMoveMachine';
import { sectionRepository } from '../../services/api/sectionRepository';
import { useQuery } from '@tanstack/react-query';

interface ScannedMachineProfileProps {
  machine: {
    id: string;
    'QR Code': string;
    'Serial#': string;
    'Asset Name': string;
    'Asset Number': string;
    section?: {
      id: number;
      section_name: string;
    } | null;
  };
}

export const ScannedMachineProfile: React.FC<ScannedMachineProfileProps> = ({ machine }) => {
  const moveMachineMutation = useMoveMachine();

  const { data: sections, isLoading } = useQuery({
    queryKey: ['sections'],
    queryFn: () => sectionRepository.getAll(),
  });

  const locationName = machine.section?.section_name || 'Client / Off-site';

  const handleMove = async (newSectionId: number) => {
    try {
      await moveMachineMutation.mutateAsync({
        machineId: machine.id,
        newSectionId,
      });
      toast.success('Machine moved successfully');
    } catch (error) {
      toast.error('Failed to move machine');
    }
  };

  return (
    <div className="w-full p-6 bg-white rounded-xl shadow-sm border border-gray-100">
      <h3 className="text-xl font-semibold text-gray-900 mb-6">Machine Profile</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <DetailItem label="Asset Name" value={machine['Asset Name'] || 'N/A'} />
          <DetailItem label="Asset Number" value={machine['Asset Number'] || 'N/A'} />
        </div>

        <div className="space-y-4">
          <DetailItem label="QR Code" value={machine['QR Code']} />
          <DetailItem label="S/N" value={machine['Serial#']} />
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-gray-100">
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Current Location</label>
          {isLoading ? (
            <p className="text-sm text-gray-500">Loading locations...</p>
          ) : (
            <select
              value={machine.section?.id || ''}
              onChange={(e) => handleMove(parseInt(e.target.value))}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-gray-200"
            >
              <option value="">Select a location</option>
              {sections?.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.section_name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
    </div>
  );
};

const DetailItem = ({ label, value }: { label: string; value: string }) => (
  <div>
    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</label>
    <p className="mt-1 text-sm text-gray-900 font-medium">{value}</p>
  </div>
);

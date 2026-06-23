import React, { useState } from 'react';
import { toast } from 'sonner';
import { useMoveMachine } from '../../hooks/useMoveMachine';
import { sectionRepository } from '../../services/api/sectionRepository';
import { useQuery } from '@tanstack/react-query';

interface ScannedMachineProfileProps {
  machine: {
    id: string;
    qr_code: string;
    serial_number: string;
    fam?: {
      asset_name: string;
      asset_number: string;
    };
    section?: {
      section_name: string;
    } | null;
  };
}

export const ScannedMachineProfile: React.FC<ScannedMachineProfileProps> = ({ machine }) => {
  const [showMoveModal, setShowMoveModal] = useState(false);
  const moveMachineMutation = useMoveMachine();

  const { data: sections, isLoading } = useQuery({
    queryKey: ['sections'],
    queryFn: () => sectionRepository.getAll(),
    enabled: showMoveModal,
  });

  const locationName = machine.section?.section_name || 'Client / Off-site';

  const handleMove = async (newSectionId: number) => {
    try {
      await moveMachineMutation.mutateAsync({
        machineId: machine.id,
        newSectionId,
      });
      toast.success('Machine moved successfully');
      setShowMoveModal(false);
    } catch (error) {
      toast.error('Failed to move machine');
    }
  };

  return (
    <div className="w-full p-6 bg-white rounded-xl shadow-sm border border-gray-100">
      <h3 className="text-xl font-semibold text-gray-900 mb-6">Machine Profile</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <DetailItem label="Asset Name" value={machine.fam?.asset_name || 'N/A'} />
          <DetailItem label="Asset Number" value={machine.fam?.asset_number || 'N/A'} />
        </div>

        <div className="space-y-4">
          <DetailItem label="QR Code" value={machine.qr_code} />
          <DetailItem label="S/N" value={machine.serial_number} />
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between">
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Current Location</label>
          <p className="mt-1 text-sm font-semibold text-gray-900">{locationName}</p>
        </div>
        
        <button
          onClick={() => setShowMoveModal(true)}
          className="px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors shadow-sm"
        >
          Move Machine
        </button>
      </div>

      {showMoveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <h4 className="text-md font-semibold mb-4">Select New Location</h4>
            {isLoading ? (
              <p className="text-sm text-gray-500">Loading sections...</p>
            ) : (
              <div className="space-y-2">
                {sections?.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => handleMove(parseInt(section.id))}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded-lg text-sm transition-colors"
                  >
                    {section.section_name}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => setShowMoveModal(false)}
              className="mt-6 w-full px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const DetailItem = ({ label, value }: { label: string; value: string }) => (
  <div>
    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</label>
    <p className="mt-1 text-sm text-gray-900 font-medium">{value}</p>
  </div>
);

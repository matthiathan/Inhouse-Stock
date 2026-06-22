import React from 'react';

interface MachineProfileCardProps {
  machine: {
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
  onMoveMachine: () => void;
}

export const MachineProfileCard: React.FC<MachineProfileCardProps> = ({ machine, onMoveMachine }) => {
  const locationName = machine.section?.section_name || 'Client / Off-site';

  return (
    <div className="w-full p-6 bg-white rounded-xl shadow-sm border border-gray-100">
      <h3 className="text-xl font-semibold text-gray-900 mb-6">Machine Profile</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Asset Details */}
        <div className="space-y-4">
          <DetailItem label="Asset Name" value={machine.fam?.asset_name || 'N/A'} />
          <DetailItem label="Asset Number" value={machine.fam?.asset_number || 'N/A'} />
        </div>

        {/* Physical Identifiers */}
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
          onClick={onMoveMachine}
          className="px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors shadow-sm"
        >
          Move Machine
        </button>
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

import React, { useState, useEffect } from 'react';
import { Machine } from '../types';
import { customerRepository } from '../services/api/customerRepository';
import { supabase } from '../lib/supabase';

interface MachineDetailCardProps {
  machine: Machine & {
    customer?: { name: string; code: string; contract_number: string };
    section?: { name: string };
  };
}

export const MachineDetailCard: React.FC<MachineDetailCardProps> = ({ machine }) => {
  const [showModal, setShowModal] = useState<string | null>(null);
  const [localSerialNumber, setLocalSerialNumber] = useState(machine.serial_number);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [contractWarning, setContractWarning] = useState<string | null>(null);

  const handleSave = async () => {
    const { error } = await supabase
      .from('machines')
      .update({ serial_number: localSerialNumber })
      .eq('qr_code', machine.qr_code);

    if (error) {
      console.error('Error updating serial number:', error);
      alert('Failed to update serial number');
    } else {
      alert('Serial number updated successfully');
    }
  };

  useEffect(() => {
    if (showModal === 'client' && searchTerm.length > 2) {
      const delayDebounceFn = setTimeout(async () => {
        setIsSearching(true);
        try {
          const results = await customerRepository.searchCustomers(searchTerm);
          setSearchResults(results);
        } catch (error) {
          console.error('Error searching customers:', error);
        } finally {
          setIsSearching(false);
        }
      }, 500);
      return () => clearTimeout(delayDebounceFn);
    } else {
      setSearchResults([]);
    }
  }, [searchTerm, showModal]);

  const handleSelectCustomer = (customer: any) => {
    if (!customer.contract_number) {
        setContractWarning(`Warning: Customer ${customer.name} does not have a valid contract.`);
    } else {
        setContractWarning(null);
        // Here you would also update the machine/client in the backend
        console.log('Customer selected:', customer);
        setShowModal(null);
        setSearchTerm('');
    }
  };

  return (
    <div className="w-full p-4 bg-white rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Asset Details</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <DetailItem label="Asset Name" value={machine.asset_name} />
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-500">S/N</label>
          <input 
              type="text" 
              value={localSerialNumber} 
              onChange={(e) => setLocalSerialNumber(e.target.value)}
              className="w-full text-sm p-1 border border-gray-300 rounded focus:border-brand-gold focus:outline-none"
          />
        </div>
        <DetailItem label="QR Code" value={machine.qr_code} />
        <DetailItem label="Customer" value={machine.customer?.name || 'N/A'} />
        <DetailItem label="Customer Code" value={machine.customer?.code || 'N/A'} />
        <DetailItem label="Contract #" value={machine.customer?.contract_number || 'N/A'} />
        <DetailItem label="Section" value={machine.section?.name || machine.section || 'N/A'} />
      </div>
      
      <div className="mt-6 flex gap-3">
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
        >
          Save Changes
        </button>
        <button
          onClick={() => setShowModal('client')}
          className="px-4 py-2 bg-brand-gold text-white text-sm font-medium rounded-lg hover:bg-yellow-600 transition-colors"
        >
          Change Client
        </button>
        <button
          onClick={() => setShowModal('section')}
          className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
        >
          Change Section
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <h4 className="text-md font-semibold mb-4">
              {showModal === 'client' ? 'Change Client' : 'Change Section'}
            </h4>
            
            {showModal === 'client' && (
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Search customers..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {contractWarning && (
                    <p className="text-sm text-red-600 font-medium">{contractWarning}</p>
                )}
                <div className="max-h-60 overflow-y-auto">
                    {isSearching ? <p className="text-sm text-gray-500">Searching...</p> : 
                     searchResults.map(c => (
                        <div 
                            key={c.id} 
                            className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
                            onClick={() => handleSelectCustomer(c)}
                        >
                            {c.name} ({c.code})
                        </div>
                    ))}
                </div>
              </div>
            )}
            
            <button
              onClick={() => {
                  setShowModal(null);
                  setSearchTerm('');
              }}
              className="mt-6 w-full px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const DetailItem = ({ label, value }: { label: string; value: string }) => (
  <div>
    <label className="block text-xs font-medium text-gray-500">{label}</label>
    <p className="text-sm text-gray-900 truncate">{value}</p>
  </div>
);

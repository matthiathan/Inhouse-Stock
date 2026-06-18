import React, { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import { useSclTasks, useUpdateSclTask } from '../features/dispatch/hooks';
import { useCustomers } from '../features/customers/hooks';
import { useTechnicians } from '../features/users/hooks';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { ComboBox } from '../components/ui/ComboBox';
import { SCLDispatchForm } from '../components/SCLDispatchForm';
import { calculateTechnicianScore } from '../utils/dispatchScoring';
import { 
  validateSclTransition, 
  logStateTransition, 
  SclStatus, 
  flagAssetAsDefectiveLocal,
  isAssetDispatchDisabled
} from '../utils/sclStateMachine';
import { 
  MapPin, 
  User, 
  Clock, 
  Calendar, 
  Tag, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle,
  HelpCircle,
  TrendingUp,
  Activity,
  History,
  Info
} from 'lucide-react';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// Setup Leaflet marker icon
let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom function to color different priority SCL markers
const createCustomMarker = (priority: string, status: string) => {
  let color = '#3b82f6'; // default blue
  if (status === 'Closed') {
    color = '#10b981'; // green
  } else if (priority === 'Critical') {
    color = '#ef4444'; // red
  } else if (priority === 'High') {
    color = '#f59e0b'; // amber
  } else if (priority === 'Medium') {
    color = '#f59e0b'; // orange/yellow
  }
  
  const markerHtmlStyles = `
    background-color: ${color};
    width: 2rem;
    height: 2rem;
    display: block;
    left: -1rem;
    top: -1rem;
    position: relative;
    border-radius: 2rem 2rem 0;
    transform: rotate(45deg);
    border: 2px solid #ffffff;
    box-shadow: 0 0 8px rgba(0,0,0,0.3);
  `;
  
  return L.divIcon({
    className: "my-custom-pin",
    iconAnchor: [0, 24],
    popupAnchor: [0, -36],
    html: `<span style="${markerHtmlStyles}" />`
  });
};

function ChangeMapCenter({ center }: { center: [number, number] }) {
  const map = useMap();
  map.setView(center, map.getZoom());
  return null;
}

export function RoutePlannerPage() {
  const { role, user } = useAuth();
  
  // SCL and master data queries
  const { data: sclTasks = [], isLoading: loadingScl, refetch: refetchScl } = useSclTasks();
  const { data: customers = [], isLoading: loadingCustomers } = useCustomers();
  const { data: technicians = [], isLoading: loadingTechs } = useTechnicians();
  const updateSclMutation = useUpdateSclTask();

  // Selected Call state for detailing/actioning
  const [selectedSclId, setSelectedSclId] = useState<string | null>(null);
  const [remarksInput, setRemarksInput] = useState<string>('');
  const [targetStatus, setTargetStatus] = useState<SclStatus | ''>('');
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([-29.8587, 31.0218]);
  const [filterTech, setFilterTech] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const selectedScl = sclTasks?.find(t => t.id === selectedSclId);

  // Score prediction for the selected ticket technicians
  const getTechScore = (tech: any, targetCustomer: any) => {
    if (!targetCustomer) return 0;
    
    // Map SCL task list to a standard ticket structure for calculation
    const taskListMapped = (sclTasks || []).map(task => ({
      id: task.id,
      tech_id: task.assigned_employee_id,
      machine_id: task.asset_id,
      status: task.status || 'Open',
      created_at: task.created_at,
      priority: task.priority,
      issue_description: task.narration,
      scheduled_time: task.assigned_date_time || ''
    }));

    return calculateTechnicianScore(tech, targetCustomer, taskListMapped as any);
  };

  const activeCustomer = selectedScl ? customers.find(c => c.id === selectedScl.customer_id) : null;

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSclId || !selectedScl) return;
    if (!targetStatus) {
      toast.error('Please pick a target status.');
      return;
    }

    // Validate using SCL State Machine module
    const validation = validateSclTransition(
      selectedScl.status || 'Open',
      targetStatus,
      remarksInput
    );

    if (!validation.valid) {
      toast.error(validation.error || 'Transition denied.');
      return;
    }

    // Mutate state
    updateSclMutation.mutate({
      id: selectedSclId,
      update: {
        status: targetStatus,
        closed_remarks: targetStatus === 'Closed' ? remarksInput : selectedScl.closed_remarks,
        closed_date: targetStatus === 'Closed' ? new Date().toISOString() : selectedScl.closed_date
      }
    }, {
      onSuccess: async () => {
        toast.success(`Success! Status changed to ${targetStatus}`);
        
        // Audit transition resiliently
        await logStateTransition(
          selectedSclId,
          selectedScl.status || 'Open',
          targetStatus,
          user?.id || 'sys',
          user?.email || 'admin@fieldservices.com',
          remarksInput || 'Manual Status Transition'
        );

        // Reset UI actions
        setTargetStatus('');
        setRemarksInput('');
        setSelectedSclId(null);
        refetchScl();
      },
      onError: (err: any) => {
        toast.error('Failed to save status transition: ' + err.message);
      }
    });
  };

  if (!['admin', 'ops_manager'].includes(role || '')) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4">
        <ShieldAlert className="w-16 h-16 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold">Access Restricted</h2>
        <p className="text-gray-500 text-sm">This page requires Administrator or Operations Manager permissions.</p>
      </div>
    );
  }

  // Filter the SCL tasks based on tech & status filter selection
  const filteredTasks = (sclTasks || []).filter(task => {
    const techMatch = filterTech === 'all' || task.assigned_employee_id === filterTech;
    const statusMatch = filterStatus === 'all' || task.status === filterStatus;
    return techMatch && statusMatch;
  });

  const centerNode = customers.length > 0 ? [customers[0].latitude, customers[0].longitude] : mapCenter;

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header and Statistics */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <h1 className="text-2xl font-bold font-sans tracking-tight text-gray-900 flex items-center gap-2">
            <Activity className="text-brand-gold animate-pulse" /> SCL Dispatch Control Hub
          </h1>
          <p className="text-sm text-gray-500">Intelligent, real-time dispatching fully powered by the SCL service log engine.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowDispatchModal(!showDispatchModal)}
            className="bg-brand-gold text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-brand-gold/90 transition shadow-sm flex items-center gap-2"
          >
            {showDispatchModal ? 'Close Dispatch Panel' : 'Open Dispatch Dispatcher'}
          </button>
        </div>
      </div>

      {/* SCL Dispatching Panel (Toggleable) */}
      {showDispatchModal && (
        <div className="scale-up duration-300">
          <SCLDispatchForm 
            onSuccess={() => {
              setShowDispatchModal(false);
              refetchScl();
            }} 
          />
        </div>
      )}

      {/* Primary Geospatial & Dynamic Scoring Board */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Map Cluster Plotting */}
        <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200/90 overflow-hidden h-[540px] flex flex-col">
          <div className="bg-slate-50 border-b border-gray-100 p-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-gray-500 flex items-center gap-2">
              <MapPin className="text-blue-500" size={14} /> Geospatial SCL Clusters
            </span>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] inline-block" /> Critical</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b] inline-block" /> High/Med</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#10b981] inline-block" /> Closed</span>
            </div>
          </div>
          <div className="flex-1 w-full relative z-10">
            <MapContainer center={centerNode as [number, number]} zoom={11} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <ChangeMapCenter center={mapCenter} />
              
              {/* Plot SCL calls geographically */}
              {filteredTasks.map(task => {
                const customer = customers.find(c => c.id === task.customer_id);
                if (!customer || !customer.latitude || !customer.longitude) return null;
                
                return (
                  <Marker 
                    key={task.id} 
                    position={[customer.latitude, customer.longitude]}
                    icon={createCustomMarker(task.priority || 'Low', task.status || 'Open')}
                  >
                    <Popup>
                      <div className="space-y-1.5 p-1 max-w-[220px]">
                        <div className="flex items-center justify-between gap-2.5 border-b border-gray-100 pb-1">
                          <span className="font-bold text-gray-800 text-xs truncate">{customer.name}</span>
                          <span className="text-[10px] uppercase font-bold text-red-600 bg-red-50 px-1 rounded">{task.priority}</span>
                        </div>
                        <p className="text-[11px] text-gray-600 leading-relaxed font-mono mt-1"><strong className="text-gray-700">Doc No:</strong> {task.doc_no}</p>
                        <p className="text-[11px] text-gray-600 leading-relaxed"><strong className="text-gray-700">Serial:</strong> {task.serial_number}</p>
                        <p className="text-[11px] text-gray-600 leading-relaxed"><strong className="text-gray-700">Issue:</strong> {task.narration}</p>
                        <p className="text-[11px] text-gray-600 leading-relaxed"><strong className="text-gray-700">Assignee:</strong> {task.assigned_employee || 'Unassigned'}</p>
                        <button 
                          onClick={() => {
                            setSelectedSclId(task.id);
                            setMapCenter([customer.latitude, customer.longitude]);
                          }} 
                          className="mt-2 w-full text-center bg-gray-900 hover:bg-brand-gold text-white text-[10px] py-1 rounded transition-colors font-medium"
                        >
                          Modify Status / Score Allocation
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        </div>

        {/* Scoring Engine & Transition Interface */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/90 p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 border-b border-gray-150 pb-2 mb-3">
              <TrendingUp className="text-brand-gold" />
              <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wide">Intelligent Scoring & Transition</h3>
            </div>

            {selectedScl ? (
              <div className="space-y-4 text-sm">
                <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                  <div className="text-xs text-gray-400 uppercase font-bold font-mono">Selected SCL Detail</div>
                  <h4 className="font-bold text-gray-800 mt-1">{selectedScl.client_name || 'Generic Customer'}</h4>
                  <div className="text-xs text-gray-500 font-mono mt-0.5">{selectedScl.doc_no} | Serial: {selectedScl.serial_number}</div>
                  <p className="text-xs text-gray-600 mt-2 bg-white p-2 rounded border border-gray-100 select-all font-mono">
                    "{selectedScl.narration}"
                  </p>
                </div>

                {/* Score ranking */}
                {activeCustomer && (
                  <div className="space-y-2">
                    <h5 className="font-semibold text-xs text-slate-700 flex items-center gap-1">
                      <User size={13} /> Best Technician Scores for location:
                    </h5>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {technicians.length === 0 ? (
                        <p className="text-xs text-gray-400">Loading technicians...</p>
                      ) : (
                        technicians
                          .map(t => ({ tech: t, score: getTechScore(t, activeCustomer) }))
                          .sort((a, b) => b.score - a.score)
                          .slice(0, 4)
                          .map(({ tech, score }) => (
                            <div key={tech.id} className="flex justify-between items-center bg-gray-50 p-2 rounded text-xs">
                              <span className="font-medium text-gray-700">{tech.full_name || tech.name}</span>
                              <span className={`px-2 d-inline py-0.5 rounded font-mono font-bold ${
                                score > 75 ? 'bg-green-100 text-green-800' :
                                score > 45 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {Math.round(score)}% match
                              </span>
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                )}

                {/* SCL strict state transition form */}
                <form onSubmit={handleUpdateStatus} className="space-y-3 pt-2 border-t border-gray-150">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">State Transition Target</label>
                    <ComboBox
                      options={[
                        { label: 'Open', value: 'Open' },
                        { label: 'In Progress', value: 'In Progress' },
                        { label: 'Closed', value: 'Closed' }
                      ]}
                      value={targetStatus}
                      onChange={(val) => setTargetStatus(val as SclStatus)}
                      searchable={false}
                    />
                  </div>

                  {targetStatus === 'Closed' && (
                    <div className="space-y-1 animate-fade-in">
                      <label className="block text-xs font-bold text-red-700 flex items-center gap-1">
                        <AlertTriangle size={13} /> Closed Remarks (Mandatory)
                      </label>
                      <textarea
                        required
                        value={remarksInput}
                        onChange={(e) => setRemarksInput(e.target.value)}
                        placeholder="Please type detailed resolution log comments..."
                        className="w-full text-xs p-2 border border-red-200 focus:outline-none focus:ring-1 focus:ring-red-500 rounded h-16 bg-red-50/10"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white p-2 text-xs rounded font-bold uppercase tracking-wider"
                  >
                    Confirm Transition
                  </button>
                </form>
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 border border-dashed rounded-lg flex flex-col items-center justify-center gap-2">
                <HelpCircle className="w-10 h-10 text-slate-300" />
                <p className="text-xs text-slate-500">Select any point or active SCL row on the map / table below to initiate intelligent routing calculations and trigger state-machine transitions.</p>
              </div>
            )}
          </div>
          
          {selectedScl && (
            <button 
              onClick={() => setSelectedSclId(null)}
              className="text-xs text-center text-gray-500 hover:text-gray-800 font-semibold"
            >
              Reset Selection
            </button>
          )}
        </div>
      </div>

      {/* SCL Management Table */}
      <div className="bg-white rounded-xl border border-gray-200/90 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Activity className="text-gray-400" size={18} />
            <span className="font-bold text-gray-800 text-xs uppercase font-sans tracking-wide">Historical Call Register</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div>
              <select 
                className="text-xs border rounded p-1.5 bg-white font-medium"
                value={filterTech}
                onChange={(e) => setFilterTech(e.target.value)}
              >
                <option value="all">Every Technician</option>
                {technicians.map(t => (
                  <option key={t.id} value={t.id}>{t.full_name || t.name}</option>
                ))}
              </select>
            </div>

            <div>
              <select
                className="text-xs border rounded p-1.5 bg-white font-medium"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">Every Status</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loadingScl ? (
            <div className="p-6 text-center text-gray-400">Syncing database entries...</div>
          ) : filteredTasks.length === 0 ? (
            <div className="p-10 text-center text-gray-400">No active service records found matching the criteria.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase">
                  <th className="p-3">Doc No</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Asset Code</th>
                  <th className="p-3">Priority</th>
                  <th className="p-3">Technician</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm">
                {filteredTasks.map(task => {
                  const customer = customers.find(c => c.id === task.customer_id);
                  const isSclBlocked = isAssetDispatchDisabled(task.serial_number);
                  return (
                    <tr 
                      key={task.id} 
                      className={`hover:bg-slate-50/50 transition-colors ${
                        selectedSclId === task.id ? 'bg-blue-50/30' : ''
                      }`}
                    >
                      <td className="p-3 font-mono font-bold text-gray-700 text-xs">
                        {task.doc_no}
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-gray-800">{task.client_name || 'Customer'}</div>
                        <div className="text-[10px] text-gray-400 truncate max-w-[150px]">{task.address}</div>
                      </td>
                      <td className="p-3">
                        <div className="text-xs text-gray-700 font-mono font-medium flex items-center gap-1.5">
                          {task.serial_number}
                          {isSclBlocked && (
                            <span className="bg-red-50 text-red-600 border border-red-200 text-[9px] px-1.5 py-0.2 rounded font-sans font-bold uppercase flex items-center gap-0.5">
                              <ShieldAlert className="w-2.5 h-2.5 inline" /> Defective
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono">QR: {task.qrcode}</div>
                      </td>
                      <td className="p-3">
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                          task.priority === 'Critical' ? 'bg-red-50 text-red-700 border border-red-100' :
                          task.priority === 'High' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                          task.priority === 'Medium' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                          'bg-gray-50 text-gray-600'
                        }`}>
                          {task.priority || 'Low'}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-gray-700 font-medium font-sans">
                        {task.assigned_employee || 'Unassigned'}
                      </td>
                      <td className="p-3 text-xs text-gray-600 font-medium">
                        {task.service_type || 'Maintenance'}
                      </td>
                      <td className="p-3">
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                          task.status === 'Closed' ? 'bg-green-100 text-green-800' :
                          task.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {task.status || 'Open'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedSclId(task.id);
                            if (customer && customer.latitude) {
                              setMapCenter([customer.latitude, customer.longitude]);
                            }
                          }}
                          className="bg-slate-100 text-slate-800 text-xs px-2.5 py-1 rounded font-bold transition hover:bg-slate-200"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

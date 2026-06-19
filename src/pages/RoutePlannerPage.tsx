import React, { useState, useMemo } from 'react';
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
import { DataTable } from '../components/DataTable';
import { 
  validateSclTransition, 
  logStateTransition, 
  SclStatus, 
  isAssetDispatchDisabled
} from '../utils/sclStateMachine';
import { 
  MapPin, 
  User, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle,
  HelpCircle,
  TrendingUp,
  Activity,
  History,
  QrCode,
  ArrowRight
} from 'lucide-react';

const icon = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png';
const iconShadow = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png';

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
  
  const { data: sclTasks = [], isLoading: loadingScl, refetch: refetchScl } = useSclTasks();
  const { data: customers = [], isLoading: loadingCustomers } = useCustomers();
  const { data: technicians = [], isLoading: loadingTechs } = useTechnicians();
  const updateSclMutation = useUpdateSclTask();

  const [selectedSclId, setSelectedSclId] = useState<string | null>(null);
  const [remarksInput, setRemarksInput] = useState<string>('');
  const [targetStatus, setTargetStatus] = useState<SclStatus | ''>('');
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([-29.8587, 31.0218]);
  const [filterTech, setFilterTech] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const selectedScl = sclTasks?.find(t => t.id === selectedSclId);

  const getTechScore = (tech: any, targetCustomer: any) => {
    if (!targetCustomer) return 0;
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

    const validation = validateSclTransition(
      selectedScl.status || 'Open',
      targetStatus,
      remarksInput,
      role || undefined
    );

    if (!validation.valid) {
      toast.error(validation.error || 'Transition denied.');
      return;
    }

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
        await logStateTransition(
          selectedSclId,
          selectedScl.status || 'Open',
          targetStatus,
          user?.id || 'sys',
          user?.email || 'admin@fieldservices.com',
          remarksInput || 'Manual Status Transition'
        );
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

  const filteredTasks = useMemo(() => {
    return (sclTasks || []).filter(task => {
      const techMatch = filterTech === 'all' || task.assigned_employee_id === filterTech;
      const statusMatch = filterStatus === 'all' || task.status === filterStatus;
      return techMatch && statusMatch;
    });
  }, [sclTasks, filterTech, filterStatus]);

  const columns = [
    {
      header: 'Doc No',
      accessorKey: 'doc_no' as const,
      cell: (val: string) => <span className="font-mono font-black text-xs text-gray-700">{val}</span>
    },
    {
      header: 'Customer',
      accessorKey: 'client_name' as const,
      cell: (_: any, row: any) => (
        <div>
          <div className="font-black text-gray-900 leading-tight">{row?.client_name || 'Generic Customer'}</div>
          <div className="text-[10px] text-gray-400 font-medium truncate max-w-[200px]">{row?.address}</div>
        </div>
      )
    },
    {
      header: 'Asset Control',
      accessorKey: 'serial_number' as const,
      cell: (val: string, row: any) => {
        const isSclBlocked = isAssetDispatchDisabled(val);
        return (
          <div className="space-y-1">
            <div className="text-xs text-gray-700 font-mono font-black flex items-center gap-1.5">
              {val}
              {isSclBlocked && (
                <span className="bg-red-50 text-red-600 border border-red-100 text-[8px] px-1.5 py-0.5 rounded font-black uppercase flex items-center gap-0.5">
                  <ShieldAlert size={8} /> Defective
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-[9px] text-gray-400 font-bold">
              <QrCode size={10} /> {row?.qrcode}
            </div>
          </div>
        );
      }
    },
    {
      header: 'Priority',
      accessorKey: 'priority' as const,
      cell: (val: string) => (
        <span className={`text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded ${
          val === 'Critical' ? 'bg-red-50 text-red-600 border border-red-100' :
          val === 'High' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
          val === 'Medium' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
          'bg-gray-50 text-gray-500'
        }`}>
          {val || 'Low'}
        </span>
      )
    },
    {
      header: 'Assignee',
      accessorKey: 'assigned_employee' as const,
      cell: (val: string) => (
        <div className="flex items-center gap-2">
          <User size={12} className="text-gray-300" />
          <span className="text-xs font-bold text-gray-600">{val || 'Unassigned'}</span>
        </div>
      )
    },
    {
      header: 'Status',
      accessorKey: 'status' as const,
      cell: (val: string) => (
        <span className={`text-[10px] uppercase font-black px-3 py-1 rounded-full border ${
          val === 'Closed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
          val === 'In Progress' ? 'bg-blue-50 text-blue-600 border-blue-100' :
          'bg-gray-50 text-gray-500 border-gray-100'
        }`}>
          {val || 'Open'}
        </span>
      )
    },
    {
      header: 'Action',
      accessorKey: 'id' as const,
      cell: (val: string, row: any) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedSclId(val);
            const customer = customers.find(c => c.id === row.customer_id);
            if (customer && customer.latitude) {
              setMapCenter([customer.latitude, customer.longitude]);
            }
          }}
          className="p-2 bg-gray-50 hover:bg-brand-gold hover:text-white rounded-lg transition-all active:scale-90"
        >
          <ArrowRight size={14} />
        </button>
      ),
      className: 'text-right'
    }
  ];

  if (!['admin', 'ops_manager'].includes(role || '')) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4">
        <ShieldAlert className="w-16 h-16 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold">Access Restricted</h2>
        <p className="text-gray-500 text-sm">This page requires Administrator or Operations Manager permissions.</p>
      </div>
    );
  }

  const centerNode = customers.length > 0 ? [customers[0].latitude, customers[0].longitude] : mapCenter;

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-8 bg-gray-50/20 min-h-screen">
      {/* Enhanced Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-gray-100">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <Activity className="text-brand-gold" size={36} /> 
            Dispatch Control
          </h1>
          <p className="text-gray-500 font-bold mt-1 uppercase text-[10px] tracking-widest leading-relaxed">
            Intelligent Geospatial Routing & State-Machine Enforcement Dashboard
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
          <button
            onClick={() => setShowDispatchModal(!showDispatchModal)}
            className={`
              px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95
              ${showDispatchModal 
                ? 'bg-gray-100 text-gray-600 hover:bg-gray-200 shadow-none' 
                : 'bg-brand-gold text-white hover:bg-brand-gold/90 shadow-brand-gold/20'}
            `}
          >
            {showDispatchModal ? 'Hide Dispatcher' : 'Open Dispatcher'}
          </button>
        </div>
      </div>

      {showDispatchModal && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
          <SCLDispatchForm 
            onSuccess={() => {
              setShowDispatchModal(false);
              refetchScl();
            }} 
          />
        </div>
      )}

      {/* Geospatial Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden h-[540px] flex flex-col group transition-all hover:shadow-xl hover:shadow-gray-200/50">
          <div className="bg-gray-50/50 border-b border-gray-50 p-4 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
              <MapPin className="text-brand-gold" size={14} /> Regional SCL Clusters
            </span>
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-[9px] font-black text-gray-400 uppercase">Critical</span>
               </div>
               <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-orange-400" />
                  <span className="text-[9px] font-black text-gray-400 uppercase">Active</span>
               </div>
               <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[9px] font-black text-gray-400 uppercase">Resolved</span>
               </div>
            </div>
          </div>
          <div className="flex-1 w-full relative z-10 grayscale-[0.2] hover:grayscale-0 transition-all duration-700">
            <MapContainer center={centerNode as [number, number]} zoom={11} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <ChangeMapCenter center={mapCenter} />
              {filteredTasks.map(task => {
                const customer = customers.find(c => c.id === task.customer_id);
                if (!customer?.latitude || !customer?.longitude) return null;
                return (
                  <Marker 
                    key={task.id} 
                    position={[customer.latitude, customer.longitude]}
                    icon={createCustomMarker(task.priority || 'Low', task.status || 'Open')}
                  >
                    <Popup>
                      <div className="p-3 min-w-[200px] space-y-3">
                        <div className="border-b border-gray-100 pb-2">
                          <h4 className="font-black text-gray-900 text-sm leading-tight">{customer.name}</h4>
                          <span className="text-[10px] font-mono text-gray-400 font-bold mt-0.5 block">{task.doc_no}</span>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[11px] text-gray-600 italic">"{task.narration}"</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[9px] font-black bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 uppercase">{task.priority}</span>
                            <span className="text-[9px] font-black bg-brand-gold/10 px-1.5 py-0.5 rounded text-brand-gold uppercase">{task.status}</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => setSelectedSclId(task.id)} 
                          className="w-full bg-gray-900 text-white text-[10px] font-black uppercase py-2 rounded-lg hover:bg-brand-gold transition-colors active:scale-95"
                        >
                          Modify Dispatch Logic
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        </div>

        {/* Intelligence Hub */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex flex-col justify-between space-y-6 transition-all hover:shadow-xl hover:shadow-gray-200/50">
          <div>
            <div className="flex items-center gap-3 border-b border-gray-50 pb-6 mb-6">
              <div className="p-3 bg-brand-gold/10 rounded-2xl text-brand-gold">
                <TrendingUp size={24} />
              </div>
              <div>
                <h3 className="font-black text-gray-900 text-lg tracking-tight">Routing AI</h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Technician Affinity Optimization</p>
              </div>
            </div>

            {selectedScl ? (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 shadow-inner">
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-3">Target Call Record</p>
                  <h4 className="font-black text-gray-900 text-lg leading-tight">{selectedScl.client_name || 'Generic Customer'}</h4>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs font-black text-gray-500 font-mono tracking-tighter bg-white px-2 py-0.5 rounded border border-gray-100">{selectedScl.doc_no}</span>
                    <span className="text-[10px] font-black text-brand-gold uppercase">{selectedScl.priority} PRIORITY</span>
                  </div>
                </div>

                {activeCustomer && (
                  <div className="space-y-4">
                    <h5 className="font-black text-[10px] uppercase tracking-widest text-gray-400 flex items-center gap-2">
                      <User size={14} className="text-brand-gold" /> Predicted Efficiency Ranking
                    </h5>
                    <div className="space-y-2">
                      {technicians.length === 0 ? (
                        <div className="p-4 bg-gray-50 rounded-xl animate-pulse" />
                      ) : (
                        technicians
                          .map(t => ({ tech: t, score: getTechScore(t, activeCustomer) }))
                          .sort((a, b) => b.score - a.score)
                          .slice(0, 3)
                          .map(({ tech, score }, idx) => (
                            <div key={tech.id} className="flex justify-between items-center bg-white border border-gray-50 p-4 rounded-xl shadow-sm hover:border-brand-gold/30 transition-all group">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center font-black text-xs text-gray-400 group-hover:bg-brand-gold group-hover:text-white transition-colors">
                                  #{idx + 1}
                                </div>
                                <span className="font-black text-gray-800 text-sm">{tech.full_name || tech.name}</span>
                              </div>
                              <div className={`px-3 py-1 rounded-full text-[10px] font-black tracking-tighter tabular-nums ${
                                score > 75 ? 'bg-emerald-50 text-emerald-600' :
                                score > 45 ? 'bg-orange-50 text-orange-600' : 'bg-red-50 text-red-600'
                              }`}>
                                {Math.round(score)}% OPTIMIZED
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                )}

                <form onSubmit={handleUpdateStatus} className="space-y-4 pt-6 border-t border-gray-50">
                   <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Lifecycle Transition</label>
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
                    <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                      <label className="text-[10px] font-black uppercase tracking-widest text-red-600 ml-1 flex items-center gap-2">
                        <AlertTriangle size={14} /> Resolution Log Required
                      </label>
                      <textarea
                        required
                        value={remarksInput}
                        onChange={(e) => setRemarksInput(e.target.value)}
                        placeholder="Detail the technical resolution steps taken..."
                        className="w-full text-sm font-bold p-4 bg-red-50/20 border border-red-100 rounded-2xl outline-none focus:ring-2 focus:ring-red-500/10 h-32 placeholder:text-red-900/20"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full bg-gray-900 text-white p-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-brand-gold transition-all shadow-xl active:scale-95"
                  >
                    Commit Dispatch Decision
                  </button>
                </form>
              </div>
            ) : (
              <div className="p-12 text-center bg-gray-50/50 border-2 border-dashed border-gray-100 rounded-3xl flex flex-col items-center justify-center gap-4 h-full min-h-[300px]">
                <div className="p-5 bg-white rounded-full shadow-sm text-brand-gold">
                  <HelpCircle size={32} />
                </div>
                <div>
                  <p className="text-gray-900 font-black tracking-tight">Intelligence Standby</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase mt-1 leading-relaxed max-w-[200px] mx-auto tracking-widest">
                    Select a cluster or register record to activate the routing engine 
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {selectedScl && (
            <button 
              onClick={() => setSelectedSclId(null)}
              className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors"
            >
              Clear Current Focus
            </button>
          )}
        </div>
      </div>

      {/* Modern Data Grid Footer */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
           <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-xl shadow-sm border border-gray-100">
                <History className="text-gray-400" size={18} />
              </div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight">Call Register Hub</h2>
           </div>

           <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
              <select 
                className="text-xs font-black uppercase tracking-tighter bg-gray-50 border-none rounded-xl px-4 py-2 text-gray-600 outline-none focus:ring-2 focus:ring-brand-gold/20"
                value={filterTech}
                onChange={(e) => setFilterTech(e.target.value)}
              >
                <option value="all">Every Technician</option>
                {technicians.map(t => (
                  <option key={t.id} value={t.id}>{t.full_name || t.name}</option>
                ))}
              </select>

              <select
                 className="text-xs font-black uppercase tracking-tighter bg-gray-50 border-none rounded-xl px-4 py-2 text-gray-600 outline-none focus:ring-2 focus:ring-brand-gold/20"
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

        <DataTable
          data={filteredTasks}
          columns={columns}
          isLoading={loadingScl}
          emptyMessage="No dispatch records match these filters"
          onRowClick={(row) => setSelectedSclId(row.id)}
        />
      </div>
    </div>
  );
}

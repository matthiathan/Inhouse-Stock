import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { assetRepository } from '../services/api/assetRepository';
import { sclRepository } from '../features/dispatch/repository';
import { ticketRepository } from '../features/tickets/repository';
import { supabase } from '../lib/supabase';
import { VMachineDetails, Section } from '../types';
import { toast } from 'sonner';
import { 
  Shield, 
  MapPin, 
  FileText, 
  ChevronLeft, 
  Plus, 
  CheckCircle2, 
  AlertCircle,
  Truck,
  History,
  Building,
  Save,
  X
} from 'lucide-react';

export function AssetDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { role } = useAuth(); 
    const [asset, setAsset] = useState<VMachineDetails | null>(null);
    const [loading, setLoading] = useState(true);
    
    // Change Section Workflow
    const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
    const [sections, setSections] = useState<any[]>([]);
    const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
    const [isSavingSection, setIsSavingSection] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    // Maintenance Ticket Workflow
    const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
    const [ticketIssue, setTicketIssue] = useState('');
    const [isSavingTicket, setIsSavingTicket] = useState(false);

    // Optional history view
    const [serviceLogs, setServiceLogs] = useState<any[]>([]);

    useEffect(() => {
        if (!id) return;
        fetchAssetData();
        fetchServiceHistory(id);
    }, [id]);

    const fetchAssetData = async () => {
        setLoading(true);
        try {
            const data = await assetRepository.getAssetDetails(id!);
            if (data) {
                setAsset(data);
                setSelectedSectionId(data.section_id);
            }
        } catch (err: any) {
            toast.error("Error loading asset details: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchServiceHistory = async (machineId: string) => {
        try {
            const logs = await sclRepository.getAll();
            const matchingLogs = (logs || [])
              .filter(log => log.asset_id === machineId || log.serial_number === asset?.serial_number || log.qrcode === asset?.qr_code)
              .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
              .map(log => ({
                id: log.id,
                created_at: log.created_at,
                status: log.current_status || log.status,
                resolution_notes: log.closed_remarks || log.narration,
                technician: { full_name: log.assigned_employee || 'Unassigned' },
              }));
            setServiceLogs(matchingLogs);
        } catch (err) {
            console.error("Failed to load service history");
        }
    };

    const loadSections = async () => {
        if (!asset?.customer_id && !asset) return;
        // The view doesn't have customer_id natively unless we fetch from machines. Let's do a direct look
        // Wait, v_machine_details doesn't have customer_id. We fetch sections by global or maybe via section table directly.
        try {
            const { data, error } = await supabase.from('section').select('id, section_name, customer_id');
            if (error) throw error;
            setSections(data || []);
        } catch (err: any) {
            toast.error("Could not load sections: " + err.message);
        }
    };

    const handleOpenSectionModal = async () => {
        setIsSectionModalOpen(true);
        await loadSections();
    };

    const performSectionChange = async () => {
        if (!asset || selectedSectionId === asset.section_id) {
            setIsSectionModalOpen(false);
            setShowConfirm(false);
            return;
        }

        const previousSectionId = asset.section_id;
        const previousSectionName = asset.section_name;
        const targetSection = sections.find(s => s.id === selectedSectionId);

        // Optimistic UI Update
        setAsset(prev => prev ? { 
            ...prev, 
            section_id: selectedSectionId,
            section_name: targetSection?.section_name || ''
        } : null);

        setIsSavingSection(true);
        try {
            await assetRepository.updateSection(asset.machine_id, selectedSectionId);
            
            // Audit Log
            await sclRepository.create({
                doc_no: `MOVE-${Date.now()}`,
                priority: 'Low',
                current_status: 'Closed',
                narration: `Moved machine from ${previousSectionName || 'Unknown'} to ${targetSection?.section_name || 'Unknown'}`,
                customer_id: asset.customer_id || '',
                assigned_employee_id: (await supabase.auth.getUser()).data.user?.id || '',
                serial_number: asset.serial_number,
                qrcode: asset.qr_code,
                client_name: asset.customer_name || '',
                address: targetSection?.section_name || '',
                service_type: 'Internal Transfer',
                sub_task: 'Section Update',
                assigned_date_time: new Date().toISOString(),
                closed_date: new Date().toISOString(),
                closed_remarks: 'Section updated from asset detail workflow',
            } as any);

            toast.success("Section updated successfully");
            setIsSectionModalOpen(false);
            setShowConfirm(false);
        } catch (err: any) {
            // Rollback
            setAsset(prev => prev ? { 
                ...prev, 
                section_id: previousSectionId,
                section_name: previousSectionName
            } : null);
            toast.error("Failed to update section: " + err.message);
        } finally {
            setIsSavingSection(false);
        }
    };

    const handleCreateTicket = async () => {
        if (!ticketIssue.trim() || !asset) return;
        setIsSavingTicket(true);
        try {
            const userRes = await supabase.auth.getUser();
            const userId = userRes.data.user?.id;
            
            await ticketRepository.create({
                machine_id: asset.machine_id,
                customer_id: asset.customer_id,
                issue_description: ticketIssue,
                tech_id: userId || '',
                priority: 'High',
                status: 'Open'
            } as any);

            toast.success("Maintenance Ticket Created");
            setTicketIssue('');
            setIsTicketModalOpen(false);
            // Refresh logs/history
            fetchServiceHistory(asset.machine_id);
        } catch (err: any) {
            toast.error("Failed to create ticket: " + err.message);
        } finally {
            setIsSavingTicket(false);
        }
    };

    if (loading) return <div className="p-8 text-text-secondary animate-pulse">Loading enterprise asset data...</div>;
    if (!asset) return <div className="p-8 text-status-critical bg-status-critical/10 rounded-lg max-w-lg mx-auto mt-8">Asset could not be located in registry.</div>;

    return (
        <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8 font-sans">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-divider pb-6">
              <div>
                <button onClick={() => navigate(-1)} className="flex items-center text-text-secondary hover:text-text-primary text-sm font-medium mb-3 transition-colors">
                  <ChevronLeft size={16} className="mr-1" /> Back
                </button>
                <h1 className="text-3xl font-bold text-text-primary tracking-tight">{asset.asset_name}</h1>
                <p className="text-text-secondary mt-1 tracking-wide text-sm uppercase">Asset Registry Core</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={handleOpenSectionModal}
                  className="bg-bg-subtle hover:bg-bg-elevated border border-divider text-text-primary font-medium text-sm py-2 px-4 rounded-lg transition-colors flex items-center shadow-sm"
                >
                  <MapPin size={16} className="mr-2" /> Change Section
                </button>
                <button 
                  onClick={() => setIsTicketModalOpen(true)}
                  className="bg-brand-gold hover:bg-brand-gold/90 text-white font-medium text-sm py-2 px-4 rounded-lg transition-colors shadow-sm flex items-center"
                >
                  <Shield size={16} className="mr-2" /> Issue Maintenance Ticket
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* Hardware Identity Card */}
                <div className="bg-bg-elevated p-6 rounded-xl border border-divider shadow-sm">
                    <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2"><Scan size={18} className="text-text-tertiary" /> Hardware Identity</h3>
                    <div className="space-y-3">
                        <div>
                            <p className="text-text-tertiary text-xs font-semibold uppercase tracking-wider mb-1">Serial Number</p>
                            <p className="text-text-primary font-mono bg-bg-base px-3 py-2 rounded-md inline-block border border-divider">{asset.serial_number}</p>
                        </div>
                        <div>
                            <p className="text-text-tertiary text-xs font-semibold uppercase tracking-wider mb-1">QR Anchor</p>
                            <p className="text-text-primary font-mono bg-bg-base px-3 py-2 rounded-md inline-block border border-divider">{asset.qr_code}</p>
                        </div>
                        <div>
                           <p className="text-text-tertiary text-xs font-semibold uppercase tracking-wider mb-1">Machine Status</p>
                           <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${asset.machine_status === 'Operational' ? 'bg-status-success/10 text-status-success' : 'bg-status-critical/10 text-status-critical'}`}>
                               {asset.machine_status || 'Operational'}
                           </span>
                        </div>
                    </div>
                </div>
                
                {/* Placement & Ownership Card */}
                <div className="bg-bg-elevated p-6 rounded-xl border border-divider shadow-sm flex flex-col justify-between">
                    <div>
                        <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2"><Building size={18} className="text-text-tertiary" /> Placement</h3>
                        <div className="space-y-4">
                            <div>
                                <p className="text-text-tertiary text-xs font-semibold uppercase tracking-wider mb-1">Customer / Region</p>
                                <p className="text-text-primary font-medium">{asset.customer_name || 'Unassigned Customer'} <span className="text-text-secondary text-sm">({asset.customer_region || 'No Region'})</span></p>
                                {asset.customer_name && (
                                   <button 
                                      onClick={() => {
                                        if (asset.customer_code) navigate(`/customers/${asset.customer_code}`);
                                        else toast.info('Detailed customer view not accessible');
                                      }}
                                      className="text-brand-gold text-xs font-medium hover:underline mt-1 bg-transparent border-0 cursor-pointer p-0"
                                   >
                                      View Customer Record
                                   </button>
                                )}
                            </div>
                            <div>
                                <p className="text-text-tertiary text-xs font-semibold uppercase tracking-wider mb-1">Assigned Section</p>
                                <div className="flex items-center justify-between">
                                    <p className="text-text-primary font-medium bg-bg-base px-3 py-2 border border-divider rounded-md flex-1 break-words">{asset.section_name || 'No Section Assigned'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Technical Meta Card */}
                <div className="bg-bg-elevated p-6 rounded-xl border border-divider shadow-sm lg:col-span-1 md:col-span-2">
                    <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2"><FileText size={18} className="text-text-tertiary" /> Specification (FAM)</h3>
                    <div className="space-y-4">
                        <div>
                            <p className="text-text-tertiary text-xs font-semibold uppercase tracking-wider mb-1">Model / Make</p>
                            <p className="text-text-primary font-medium">{asset.model_name || 'N/A'} <span className="text-text-secondary text-sm ml-1">by {asset.manufacturer || 'Unknown'}</span></p>
                        </div>
                        <div>
                            <p className="text-text-tertiary text-xs font-semibold uppercase tracking-wider mb-1">Category</p>
                            <p className="text-text-primary">{asset.category || 'Standard'}</p>
                        </div>
                        <div>
                            <p className="text-text-tertiary text-xs font-semibold uppercase tracking-wider mb-1">Contract Cover</p>
                            <p className="text-text-primary font-mono text-sm">{asset.contract_number ? `${asset.contract_number} (${asset.contract_type})` : 'No Active SLA'}</p>
                            {asset.contract_number && (
                               <button onClick={() => toast.info('Contract Module Integration Pending')} className="text-brand-gold text-xs font-medium hover:underline mt-1 cursor-pointer bg-transparent border-0 p-0">Review Terms</button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Service History Pane */}
            <div className="bg-bg-elevated border border-divider rounded-xl overflow-hidden shadow-sm mt-8">
                <div className="px-6 py-4 border-b border-divider flex items-center justify-between bg-bg-subtle">
                    <h3 className="font-bold text-text-primary flex items-center gap-2"><History size={18} className="text-text-tertiary"/> Maintenance Ledger</h3>
                    <span className="text-xs font-bold font-mono bg-bg-base border border-divider text-text-secondary px-2 py-1 rounded">{serviceLogs.length} Records</span>
                </div>
                {serviceLogs.length > 0 ? (
                    <div className="divide-y divide-divider flex flex-col">
                        {serviceLogs.map((log) => (
                            <div key={log.id} className="p-6 transition-colors hover:bg-bg-subtle/50">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <p className="text-sm font-semibold text-text-primary">{(log.technician as any)?.full_name || 'System Auto-Audit'}</p>
                                        <p className="text-xs text-text-secondary font-mono mt-0.5">{new Date(log.created_at).toLocaleString()}</p>
                                    </div>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-bg-base border border-divider text-text-secondary">
                                        {log.status}
                                    </span>
                                </div>
                                <p className="text-sm text-text-primary mt-2">{log.resolution_notes || log.narration || "No resolution details provided."}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-12 text-center text-text-secondary flex flex-col items-center justify-center">
                        <History size={32} className="text-divider mb-4" />
                        <p className="font-medium text-text-primary">Pristine Record</p>
                        <p className="text-sm mt-1">No service anomalies or tickets recorded for this asset.</p>
                    </div>
                )}
            </div>

            {/* Section Modal Workflow */}
            {isSectionModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-bg-elevated w-full max-w-md rounded-2xl shadow-2xl border border-divider overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b border-divider flex items-center justify-between bg-bg-subtle">
                            <h3 className="font-bold text-text-primary">Transfer Section</h3>
                            <button onClick={() => setIsSectionModalOpen(false)} className="text-text-tertiary hover:text-text-primary"><X size={20} /></button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto max-h-[60vh]">
                            {!showConfirm ? (
                                <div className="space-y-4">
                                    <label className="block text-sm font-medium text-text-secondary">Select Destination Section</label>
                                    <select 
                                        className="w-full bg-bg-base border border-divider rounded-lg p-3 text-text-primary focus:border-brand-gold focus:ring-1 focus:ring-brand-gold appearance-none"
                                        value={selectedSectionId || ''}
                                        onChange={(e) => setSelectedSectionId(e.target.value)}
                                    >
                                        <option value="" disabled>-- Select New Location --</option>
                                        {sections.map(s => (
                                            <option key={s.id} value={s.id}>{s.section_name}</option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <div className="bg-status-warning/10 border border-status-warning/20 p-4 rounded-lg">
                                    <h4 className="text-status-warning font-bold flex items-center gap-2 mb-2"><AlertCircle size={18}/> Confirm Transfer</h4>
                                    <p className="text-sm text-text-primary">
                                        You are moving <strong>{asset.serial_number}</strong> to a new section. This will trigger an automated audit log entry under your technician ID.
                                    </p>
                                </div>
                            )}
                        </div>
                        
                        <div className="p-6 border-t border-divider bg-bg-base flex gap-3 justify-end">
                            <button 
                                onClick={() => showConfirm ? setShowConfirm(false) : setIsSectionModalOpen(false)} 
                                className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={() => showConfirm ? performSectionChange() : setShowConfirm(true)}
                                disabled={!selectedSectionId || isSavingSection}
                                className="bg-brand-gold hover:bg-brand-gold/90 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-lg font-medium text-sm transition-colors flex items-center justify-center min-w-[120px]"
                            >
                                {isSavingSection ? 'Synchronizing...' : showConfirm ? 'Acknowledge & Save' : 'Proceed'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Ticket Creation Modal */}
            {isTicketModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-bg-elevated w-full max-w-lg rounded-2xl shadow-2xl border border-divider overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b border-divider flex items-center justify-between bg-bg-subtle">
                            <h3 className="font-bold text-text-primary flex items-center gap-2"><Shield size={18}/> Log Service Issue</h3>
                            <button onClick={() => setIsTicketModalOpen(false)} className="text-text-tertiary hover:text-text-primary"><X size={20} /></button>
                        </div>
                        <div className="p-6">
                            <label className="block text-sm font-medium text-text-secondary mb-2">Description of Hardware Issue</label>
                            <textarea
                                value={ticketIssue}
                                onChange={(e) => setTicketIssue(e.target.value)}
                                rows={4}
                                className="w-full bg-bg-base border border-divider rounded-lg p-3 text-text-primary focus:border-brand-gold focus:ring-1 focus:ring-brand-gold resize-none"
                                placeholder="Describe the mechanical or software fault..."
                            />
                        </div>
                        <div className="px-6 py-4 border-t border-divider bg-bg-subtle flex gap-3 justify-end items-center">
                            <button onClick={() => setIsTicketModalOpen(false)} className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
                            <button 
                                onClick={handleCreateTicket} 
                                disabled={isSavingTicket || !ticketIssue.trim()}
                                className="bg-brand-gold hover:bg-brand-gold/90 disabled:opacity-50 text-white px-5 py-2 rounded-lg font-medium text-sm transition-colors"
                            >
                                {isSavingTicket ? 'Logging...' : 'Submit Ticket'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Ensure icon is defined
const Scan = (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/></svg>;

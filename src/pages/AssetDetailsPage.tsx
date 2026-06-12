import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { Machine, Section } from '../types';
import { updateAssetSection } from '../api/assetApi';
import { toast } from 'sonner';
import { 
  Shield, 
  Wrench, 
  MapPin, 
  QrCode, 
  Activity, 
  Calendar, 
  FileText, 
  ChevronLeft, 
  Settings, 
  Plus, 
  CheckCircle2, 
  AlertCircle,
  Truck
} from 'lucide-react';

export function AssetDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const { can_update_location } = useAuth();
    const navigate = useNavigate();
    const [asset, setAsset] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [sections, setSections] = useState<Section[]>([]);
    const [selectedSection, setSelectedSection] = useState('');
    const [saving, setSaving] = useState(false);
    const [searchParams] = useSearchParams();

    // Maintenance Tickets State
    const [tickets, setTickets] = useState<any[]>([]);
    const [loadingTickets, setLoadingTickets] = useState(false);
    const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
    const [ticketIssue, setTicketIssue] = useState('');
    const [submittingTicket, setSubmittingTicket] = useState(false);

    // Fetch Maintenance Tickets
    const fetchMaintenanceTickets = async () => {
        if (!id) return;
        setLoadingTickets(true);
        try {
            const { data, error } = await supabase
                .from('maintenance_tickets')
                .select('*')
                .eq('machine_id', id)
                .order('created_at', { ascending: false });
                
            if (error) {
                console.error("Error fetching tickets:", error);
                setTickets([]);
            } else if (data) {
                setTickets(data);
            }
        } catch (err: any) {
            console.error("Exception fetching tickets:", err);
            setTickets([]);
        } finally {
            setLoadingTickets(false);
        }
    };

    useEffect(() => {
        const fetchAssetDetails = async () => {
            try {
                // First attempt direct lookup inside the 'fam' table using id
                const { data: famData, error: famError } = await supabase
                    .from('fam')
                    .select('*')
                    .eq('id', id)
                    .maybeSingle();

                let resolvedFamRecord = famData;

                // Resilient fallback logic if FAM record is not found directly by integer id (e.g., if clicked machine has a different machine table integer id)
                if (!resolvedFamRecord && id) {
                    const { data: machData } = await supabase
                        .from('machines')
                        .select('qr_code, serial_number')
                        .eq('id', id)
                        .maybeSingle();

                    if (machData) {
                        const qr = machData.qr_code;
                        const sn = machData.serial_number;
                        
                        if (qr || sn) {
                            const clauses = [];
                            if (qr) clauses.push(`"QR Code".eq.${qr}`);
                            if (sn) clauses.push(`"Serial#".eq.${sn}`);
                            
                            const { data: backupFamData } = await supabase
                                .from('fam')
                                .select('*')
                                .or(clauses.join(','))
                                .maybeSingle();
                                
                            if (backupFamData) {
                                resolvedFamRecord = backupFamData;
                            }
                        }
                    }
                }

                if (resolvedFamRecord) {
                    setAsset(resolvedFamRecord);
                    if (searchParams.get('action') === 'update_section' || searchParams.get('action') === 'update_location') {
                        setIsModalOpen(true);
                    }
                    if (searchParams.get('action') === 'log_maintenance') {
                        setIsTicketModalOpen(true);
                    }
                } else {
                    // Try one last direct maybeSingle fallback to prevent empty state
                    const { data: directFam } = await supabase
                        .from('fam')
                        .select('*')
                        .eq('id', id)
                        .maybeSingle();
                    if (directFam) {
                        setAsset(directFam);
                    } else {
                        throw new Error(famError?.message || "Asset record could not be found in the Fixed Asset Management registry.");
                    }
                }
            } catch (err: any) {
                toast.error(`Error fetching asset details: ${err.message || 'Unknown error'}`);
                setAsset(null);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchAssetDetails();
            fetchMaintenanceTickets();
        }
    }, [id, searchParams]);

    useEffect(() => {
        const fetchSections = async () => {
            try {
                const { data, error } = await supabase
                    .from('section')
                    .select('id, section_name');
                if (error) {
                    toast.error(`Failed to fetch sections: ${error.message}`);
                    setSections([]);
                } else if (data && data.length > 0) {
                    setSections(data as Section[]);
                    if (asset && asset["Current Location"]) {
                        setSelectedSection(asset["Current Location"]);
                    } else if (asset && asset.section) {
                        setSelectedSection(asset.section);
                    } else {
                        setSelectedSection(data[0].section_name);
                    }
                } else {
                    setSections([]);
                }
            } catch (err: any) {
                toast.error(`Error fetching sections: ${err.message || 'Unknown error'}`);
                setSections([]);
            }
        };

        if (isModalOpen && sections.length === 0) {
            fetchSections();
        }
    }, [isModalOpen, sections.length, asset]);

    const handleSave = async () => {
        if (!asset || !selectedSection) return;
        setSaving(true);
        try {
            // 1. Perform the database update
            await updateAssetSection(asset.id, selectedSection);
            
            // 2. Force the local state to match the new DB value
            setAsset(prev => prev ? { 
                ...prev, 
                "Current Location": selectedSection,
                section: selectedSection 
            } : null);
            
            // 3. Clear the local cache so the app is forced to fetch fresh data next time
            localStorage.removeItem('cached_assets');
            
            toast.success("Section updated successfully!");
            setIsModalOpen(false);
        } catch (err: any) {
            toast.error("Database update failed.");
        } finally {
            setSaving(false);
        }
    };

    const handleAddTicket = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id || !ticketIssue.trim()) {
            toast.error("Please enter issue details");
            return;
        }
        setSubmittingTicket(true);
        try {
            const { error } = await supabase
                .from('maintenance_tickets')
                .insert([
                    {
                        machine_id: id,
                        issue_description: ticketIssue.trim()
                    }
                ]);
            if (error) {
                toast.error(`Error logging ticket: ${error.message}`);
                throw error;
            } else {
                toast.success("Maintenance ticket logged successfully!");
                setTicketIssue('');
                setIsTicketModalOpen(false);
                navigate(`/assets/${id}`, { replace: true });
                await fetchMaintenanceTickets();
            }
        } catch (err: any) {
            toast.error(`Error: ${err.message || "Failed to log ticket"}`);
        } finally {
            setSubmittingTicket(false);
        }
    };

    if (loading) {
        return (
            <div className="p-8 text-center text-text-secondary flex flex-col items-center justify-center min-h-[400px] gap-2">
                <div className="w-10 h-10 border-4 border-brand-gold border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm font-semibold text-text-secondary mt-2">Loading asset tracking dossier...</p>
            </div>
        );
    }
    
    if (!asset) {
        return (
            <div className="p-8 text-center text-text-secondary max-w-lg mx-auto mt-12 bg-bg-elevated border border-brand-border rounded-xl">
                <AlertCircle className="mx-auto text-red-500 mb-4" size={40} />
                <h2 className="text-lg font-bold text-text-primary mb-2">Asset Not Found</h2>
                <p className="text-sm text-text-secondary mb-6">The database ledger does not contain any machine records matching this specific control key.</p>
                <Link to="/assets" className="inline-flex items-center gap-2 text-brand-gold font-semibold hover:underline text-sm">
                    <ChevronLeft size={16} /> Return to Fleet List
                </Link>
            </div>
        );
    }

    // Determine operational status
    // Standard system columns might provide status, otherwise default to 'Active' or 'Maintenance' if tickets are open
    const statusValue = asset.status || (tickets.length > 0 ? 'Maintenance' : 'Active');
    
    // Format creation timestamp
    const systemLogDateStr = asset["Created TS"] 
        ? new Date(asset["Created TS"]).toLocaleString() 
        : asset.created_at
        ? new Date(asset.created_at).toLocaleString()
        : new Date().toLocaleString();

    // Specific FAM field mappings with graceful defaults
    const assetName = asset["Asset Name"] || "N/A";
    const serialNumber = asset["Serial#"] || "N/A";
    const qrCode = asset["QR Code"] || "N/A";
    const customer = asset["Current Customer Name"] || "N/A";
    const contractNo = asset["Contract#"] || "N/A";
    const costPrice = asset["Cost Amount"] !== null && asset["Cost Amount"] !== undefined ? asset["Cost Amount"] : "N/A";
    const currentLocation = asset["Current Location"] || asset.section || "N/A";

    const formatCurrency = (value: any) => {
        if (value === null || value === undefined || value === '' || value === 'N/A') return 'N/A';
        const num = Number(value);
        if (isNaN(num)) return value;
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
    };

    // Render operational status badge helper
    const renderStatusBadge = (status: string) => {
        const norm = status.toLowerCase();
        if (norm === 'active' || norm === 'online') {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-green-500/10 text-green-500 border border-green-500/20 uppercase tracking-wider">
                    <CheckCircle2 size={12} />
                    Active
                </span>
            );
        } else if (norm === 'maintenance' || norm === 'repair' || norm === 'logged') {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-wider">
                    <Wrench size={12} />
                    Maintenance
                </span>
            );
        } else if (norm === 'in transit' || norm === 'transit' || norm === 'moving') {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 uppercase tracking-wider">
                    <Truck size={12} />
                    In Transit
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-bg-base text-text-secondary border border-brand-border uppercase tracking-wider">
                <Activity size={12} />
                {status}
            </span>
        );
    };

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 text-text-primary">
            {/* Header section with back navigation and Log Service Ticket button */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <Link to="/assets" className="inline-flex items-center gap-1 text-text-secondary hover:text-brand-gold transition-colors text-xs font-bold uppercase tracking-wider mb-1">
                        <ChevronLeft size={14} /> Back to Fleet Inventory
                    </Link>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary flex items-center gap-2">
                        {assetName}
                    </h1>
                    <p className="text-xs text-text-secondary">
                        Comprehensive ledger profiling and Fixed Asset Management (FAM) parameters
                    </p>
                </div>
                <div className="flex gap-2.5">
                    <button
                        onClick={() => setIsTicketModalOpen(true)}
                        className="px-4 py-2 rounded-lg bg-brand-gold hover:bg-brand-gold/90 text-white transition-colors text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-sm min-h-[44px]"
                        id="btn-log-service-ticket"
                    >
                        <Wrench size={16} /> Log Service Ticket
                    </button>
                </div>
            </div>

            {/* Primary Profile Details Card - Presents 7 Requested Fields */}
            <div className="bg-bg-elevated p-6 sm:p-8 rounded-2xl border border-brand-border shadow-md space-y-6">
                <div>
                    <h2 className="text-lg font-bold text-text-primary flex items-center gap-2 border-b border-brand-border/40 pb-3">
                        <Shield className="text-brand-gold" size={20} />
                        Fixed Asset Management Profile
                    </h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Item 1: Asset Name */}
                    <div className="bg-bg-base/40 p-5 rounded-xl border border-brand-border/55 space-y-1.5 hover:border-brand-border/85 transition-colors">
                        <span className="text-[10px] font-extrabold text-brand-gold uppercase tracking-wider block">Asset Name</span>
                        <p className="text-sm font-bold text-text-primary leading-tight">{assetName}</p>
                    </div>

                    {/* Item 2: Serial Number */}
                    <div className="bg-bg-base/40 p-5 rounded-xl border border-brand-border/55 space-y-1.5 hover:border-brand-border/85 transition-colors">
                        <span className="text-[10px] font-extrabold text-brand-gold uppercase tracking-wider block">Serial Number / S/N</span>
                        <p className="text-sm font-mono font-bold text-text-primary">{serialNumber}</p>
                    </div>

                    {/* Item 3: QR Code */}
                    <div className="bg-bg-base/40 p-5 rounded-xl border border-brand-border/55 space-y-1.5 hover:border-brand-border/85 transition-colors">
                        <span className="text-[10px] font-extrabold text-brand-gold uppercase tracking-wider block">QR Code</span>
                        <div className="flex items-center gap-2">
                            <QrCode size={14} className="text-text-secondary" />
                            <p className="text-sm font-mono font-bold text-text-primary truncate" title={qrCode}>{qrCode}</p>
                        </div>
                    </div>

                    {/* Item 4: Customer */}
                    <div className="bg-bg-base/40 p-5 rounded-xl border border-brand-border/55 space-y-1.5 hover:border-brand-border/85 transition-colors">
                        <span className="text-[10px] font-extrabold text-brand-gold uppercase tracking-wider block">Customer</span>
                        <p className="text-sm font-bold text-text-primary">{customer}</p>
                    </div>

                    {/* Item 5: Contract Number */}
                    <div className="bg-bg-base/40 p-5 rounded-xl border border-brand-border/55 space-y-1.5 hover:border-brand-border/85 transition-colors">
                        <span className="text-[10px] font-extrabold text-brand-gold uppercase tracking-wider block">Contract Number / Contract#</span>
                        <p className="text-sm font-mono font-semibold text-text-primary">{contractNo}</p>
                    </div>

                    {/* Item 6: Cost Price */}
                    <div className="bg-bg-base/40 p-5 rounded-xl border border-brand-border/55 space-y-1.5 hover:border-brand-border/85 transition-colors">
                        <span className="text-[10px] font-extrabold text-brand-gold uppercase tracking-wider block">Cost Price / Cost Amount</span>
                        <p className="text-sm font-semibold text-green-500 font-mono">{formatCurrency(costPrice)}</p>
                    </div>

                    {/* Item 7: Section / Location */}
                    <div className="bg-bg-base/40 p-5 rounded-xl border border-brand-border/55 space-y-1.5 hover:border-brand-border/85 transition-colors lg:col-span-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1.5">
                            <span className="text-[10px] font-extrabold text-brand-gold uppercase tracking-wider block">Section / Location (Current Location)</span>
                            <div className="flex items-center gap-1.5">
                                <MapPin size={16} className="text-brand-gold" />
                                <span className="text-sm font-bold text-text-primary">{currentLocation}</span>
                            </div>
                        </div>
                        <div>
                            {!can_update_location ? (
                                <button 
                                    className="text-text-secondary/50 text-xs font-bold uppercase tracking-wider cursor-not-allowed py-2 px-3 bg-bg-base rounded-lg border border-brand-border/60 flex items-center gap-1.5" 
                                    title="Permission denied"
                                    disabled
                                >
                                    Location Locked 🔒
                                </button>
                            ) : (
                                <button 
                                    onClick={() => setIsModalOpen(true)} 
                                    className="text-brand-gold hover:text-white bg-brand-gold/10 hover:bg-brand-gold border border-brand-gold/20 hover:border-brand-gold transition-all text-xs font-bold uppercase tracking-wider py-2 px-4 rounded-lg cursor-pointer flex items-center gap-1.5 min-h-[40px]"
                                >
                                    <MapPin size={14} /> Update Location
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Maintenance Tickets Section */}
            <div className="bg-bg-elevated rounded-2xl border border-brand-border shadow-sm overflow-hidden mt-8">
                <div className="p-6 border-b border-brand-border bg-bg-elevated/40 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <Wrench className="text-brand-gold" size={20} />
                        <div>
                            <h2 className="text-lg font-bold text-text-primary">📋 Maintenance Log & Tickets</h2>
                            <p className="text-xs text-text-secondary mt-0.5">Historic audit logs of mechanical repairs and services</p>
                        </div>
                    </div>
                    <span className="text-xs bg-bg-base px-3 py-1 rounded-full border border-brand-border text-text-secondary font-bold font-mono">
                        {tickets.length} {tickets.length === 1 ? 'RECORD' : 'RECORDS'}
                    </span>
                </div>

                <div className="p-6">
                    {loadingTickets ? (
                        <div className="p-8 text-center text-text-secondary flex flex-col items-center gap-2">
                            <div className="w-6 h-6 border-2 border-brand-gold border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-sm">Loading service records...</p>
                        </div>
                    ) : tickets.length === 0 ? (
                        <div className="border border-dashed border-brand-border/85 p-8 rounded-xl text-center max-w-md mx-auto">
                            <div className="text-3xl mb-2">✅</div>
                            <p className="text-sm text-text-primary font-bold">No Active Maintenance Tickets</p>
                            <p className="text-xs text-text-secondary mt-1">This machine is running smoothly. No defects or manual logs exist in this tracker history.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {tickets.map((ticket) => (
                                <div 
                                    key={ticket.id} 
                                    className="bg-bg-base/60 p-5 rounded-xl border border-brand-border shadow-sm flex flex-col sm:flex-row sm:items-start justify-between gap-4 transition-all hover:border-brand-border/80"
                                >
                                    <div className="space-y-2 flex-grow">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-brand-gold/10 text-brand-gold uppercase tracking-wider font-mono">
                                                Ticket #{ticket.id}
                                            </span>
                                            {ticket.created_at && (
                                                <span className="text-xs text-text-secondary font-mono">
                                                    {new Date(ticket.created_at).toLocaleString()}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-text-primary text-sm font-medium whitespace-pre-wrap leading-relaxed">
                                            {ticket.issue_description}
                                        </p>
                                    </div>
                                    <div className="text-[10px] text-text-secondary self-start sm:self-center font-mono font-bold py-1 px-2.5 bg-bg-elevated border border-brand-border/50 rounded-lg uppercase tracking-wider">
                                        Status: <span className="text-green-500 font-extrabold font-mono">Logged</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Section Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
                    <div className="bg-bg-elevated p-6 rounded-xl border border-brand-border w-full max-w-sm shadow-xl animate-fade-in">
                        <div className="flex items-center gap-2 mb-3">
                            <MapPin className="text-brand-gold" size={20} />
                            <h2 className="text-lg font-bold text-text-primary">Update Location / Section</h2>
                        </div>
                        <p className="text-xs text-text-secondary mb-4">Re-assign physical warehouse section for asset <span className="font-semibold text-text-primary">{assetName}</span>.</p>
                        <select 
                            value={selectedSection} 
                            onChange={(e) => setSelectedSection(e.target.value)}
                            className="w-full p-2.5 min-h-[44px] border border-brand-border rounded-lg mb-4 bg-bg-base text-text-primary outline-none focus:border-brand-gold text-sm cursor-pointer font-medium"
                        >
                            {sections.map(s => <option key={s.id} value={s.section_name}>{s.section_name}</option>)}
                        </select>
                        <div className="flex justify-end gap-2 border-t border-brand-border/50 pt-3">
                            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2.5 min-h-[44px] text-text-secondary hover:bg-bg-base rounded-lg cursor-pointer text-sm font-semibold transition-all">Cancel</button>
                            <button onClick={handleSave} disabled={saving} className="bg-brand-gold text-white px-5 py-2.5 min-h-[44px] rounded-lg font-bold hover:bg-brand-gold/90 transition-all flex items-center justify-center text-sm cursor-pointer min-w-[120px]">
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Ticket Modal */}
            {isTicketModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
                    <div className="bg-bg-elevated p-6 rounded-xl border border-brand-border w-full max-w-md shadow-xl animate-fade-in">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-xl">🛠️</span>
                            <h2 className="text-lg font-bold text-text-primary font-sans">Log Service Ticket</h2>
                        </div>
                        <p className="text-xs text-text-secondary mb-4">
                            Report issues, repairs, or schedule maintenance notes for <span className="font-semibold text-text-primary">{assetName}</span>.
                        </p>
                        
                        <form onSubmit={handleAddTicket} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-text-secondary tracking-wider mb-1.5">
                                    Issue Details / Maintenance Notes
                                </label>
                                <textarea
                                    value={ticketIssue}
                                    onChange={(e) => setTicketIssue(e.target.value)}
                                    placeholder="Describe the issue, required repair, or regular maintenance details..."
                                    rows={4}
                                    required
                                    className="w-full p-3 border border-brand-border rounded-lg bg-bg-base text-text-primary text-sm outline-none focus:border-brand-gold placeholder-text-secondary/50 transition-all font-sans"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-brand-border/60">
                                <button 
                                    type="button" 
                                    onClick={() => {
                                        setIsTicketModalOpen(false);
                                        navigate(`/assets/${id}`, { replace: true });
                                    }} 
                                    className="px-4 py-2 text-text-secondary hover:bg-bg-base rounded-lg cursor-pointer text-sm font-medium transition-all min-h-[40px]"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={submittingTicket || !ticketIssue.trim()} 
                                    className="bg-brand-gold text-white px-5 py-2 rounded-lg font-semibold hover:bg-brand-gold/90 transition-colors flex items-center justify-center text-sm cursor-pointer disabled:opacity-50 min-h-[40px] gap-1.5"
                                >
                                    {submittingTicket ? (
                                        <>
                                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                            Submitting...
                                        </>
                                    ) : (
                                        'Submit Ticket'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

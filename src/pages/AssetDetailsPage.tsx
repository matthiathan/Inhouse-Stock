import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { sectionRepository } from '../services/api/sectionRepository';
import { assetRepository } from '../services/api/assetRepository';
import { ticketRepository } from '../features/tickets/repository';
import { Machine, Section } from '../types';
import { updateAssetSection } from '../api/assetApi';
import { createMaintenanceTicket, closeMaintenanceTicket } from '../api/maintenance';
import { uploadAssetPhoto } from '../lib/storage';
import { toast } from 'sonner';
import { Html5QrcodeScanner } from 'html5-qrcode';
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
  Truck,
  Camera
} from 'lucide-react';

export function AssetDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const { can_update_location, role } = useAuth(); // Extract role and permissions
    const [asset, setAsset] = useState<Machine | null>(null);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Ticket handling states
    const [tickets, setTickets] = useState<any[]>([]);
    const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
    const [newTicketIssue, setNewTicketIssue] = useState('');
    const [submittingTicket, setSubmittingTicket] = useState(false);

    // Ticket resolution state
    const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
    const [resolutionNotes, setResolutionNotes] = useState('');
    const [submittingResolution, setSubmittingResolution] = useState(false);
    const [qrVerified, setQrVerified] = useState(false);
    const [scannedQr, setScannedQr] = useState<string | null>(null);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    
    const [sections, setSections] = useState<Section[]>([]);
    const [selectedSection, setSelectedSection] = useState('');
    const [saving, setSaving] = useState(false);
    const [searchParams] = useSearchParams();
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [pendingMachinePhoto, setPendingMachinePhoto] = useState<File | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, assetId: string) => {
        if (e.target.files && e.target.files[0]) {
            setUploadingPhoto(true);
            try {
                const publicUrl = await uploadAssetPhoto(e.target.files[0], assetId);
                
                // Update database record with the new URL
                await assetRepository.update(assetId, { photo_url: publicUrl } as any);
                
                // Update local state
                setAsset(prev => prev ? { ...prev, photo_url: publicUrl } as any : null);
                toast.success('Photo uploaded successfully');
            } catch (err: any) {
                toast.error('Upload failed: ' + err.message);
            } finally {
                setUploadingPhoto(false);
            }
        }
    };

    const fetchTickets = async () => {
        if (!id) return;
        try {
            const ticketData = await ticketRepository.getTicketsByMachineId(id);
            setTickets(ticketData || []);
        } catch (err: any) {
            console.error("Failed to fetch tickets", err);
        }
    };

    useEffect(() => {
        const fetchAssetData = async () => {
            if (!id) return;
            setLoading(true);
            try {
                const machineData = await assetRepository.getById(id);
                setAsset(machineData as Machine);

                await fetchTickets();

                const action = searchParams.get('action');
                if (action === 'update_section') setIsModalOpen(true);
                if (action === 'log_maintenance') setIsTicketModalOpen(true);
            } catch (err: any) {
                toast.error("Error loading asset details: " + err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchAssetData();
    }, [id, searchParams]);

    // Create ticket submission handler (Admins & Ops Managers)
    const handleSubmitTicket = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!id || !newTicketIssue.trim()) return;
      setSubmittingTicket(true);
      try {
        await createMaintenanceTicket(id, newTicketIssue);
        toast.success("Maintenance ticket created successfully");
        setNewTicketIssue('');
        setIsTicketModalOpen(false);
        await fetchTickets();
      } catch (err: any) {
        toast.error("Failed to create ticket: " + err.message);
      } finally {
        setSubmittingTicket(false);
      }
    };

    // Close ticket handler (Technicians / Techs)
    const handleResolveTicket = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTicketId || !resolutionNotes.trim() || !qrVerified || !photoFile) return;
        setSubmittingResolution(true);
        try {
            await closeMaintenanceTicket(selectedTicketId, resolutionNotes, photoFile);
            toast.success("Service ticket resolved/closed successfully");
            setResolutionNotes('');
            setPhotoFile(null);
            setQrVerified(false);
            setScannedQr(null);
            setSelectedTicketId(null);
            setIsResolveModalOpen(false);
            await fetchTickets();
        } catch (err: any) {
            toast.error("Failed to close ticket: " + err.message);
        } finally {
            setSubmittingResolution(false);
        }
    };

    const fetchSections = async () => {
        try {
            const data = await sectionRepository.getAll();
            setSections(data || []);
            if (asset && asset.section) setSelectedSection(asset.section);
            else if (data && data.length > 0) setSelectedSection(data[0].section_name);
        } catch (err: any) {
            toast.error("Could not load sections: " + err.message);
        }
    };

    const handleSave = async () => {
        if (!asset || !selectedSection) return;
        setSaving(true);
        try {
            let photoUrl = asset.photo_url;

            // If a new file was captured, upload it first
            if (pendingMachinePhoto) {
                try {
                    photoUrl = await uploadAssetPhoto(pendingMachinePhoto, asset.id);
                } catch (error) {
                    console.error("Upload failed", error);
                    toast.error("Failed to upload image. Please try again.");
                    setSaving(false);
                    return; // Stop the save process
                }
            }

            // Proceed to save the record
            await updateAssetSection(asset.id, selectedSection);
            
            // If photo was updated, also update the photo_url field
            if (photoUrl !== asset.photo_url) {
                await assetRepository.update(asset.id, { photo_url: photoUrl } as any);
            }

            setAsset(prev => prev ? { ...prev, section: selectedSection, photo_url: photoUrl } : null);
            localStorage.removeItem('cached_assets');
            toast.success("Asset updated successfully!");
            setIsModalOpen(false);
            setPendingMachinePhoto(null);
        } catch (err: any) {
            toast.error("Database update failed.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-4 md:p-8 animate-fade-in text-text-primary">Loading asset details...</div>;
    if (!asset) return <div className="p-4 md:p-8 text-text-primary">Asset not found</div>;

    const isAuthorizedToLog = role === 'admin' || role === 'ops_manager';
    const isAuthorizedToClose = role === 'tech' || role === 'admin';

    return (
        <div className="p-4 md:p-8 max-w-4xl relative space-y-6 font-sans">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">{asset.asset_name}</h1>
              {isAuthorizedToLog && (
                <button 
                  onClick={() => setIsTicketModalOpen(true)}
                  className="bg-brand-gold hover:bg-brand-gold/90 text-white font-medium text-sm py-2.5 px-4 rounded-lg transition-colors cursor-pointer shadow-sm flex items-center justify-center gap-1.5 self-start min-h-[44px]"
                >
                  🛠️ Create Service Ticket
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                {/* Identifiers Card */}
                <div className="bg-bg-elevated p-6 rounded-xl border border-brand-border shadow-sm flex flex-col justify-between">
                    <div>
                        <h3 className="font-bold text-text-primary mb-3">Identifiers</h3>
                        <p className="text-text-secondary text-sm mb-1.5">S/N: <span className="text-text-primary font-mono">{asset.serial_number}</span></p>
                        <p className="text-text-secondary text-sm">QR Code: <span className="text-text-primary font-mono">{asset.qr_code}</span></p>
                    </div>
                </div>
                
                {/* Section / Location Card */}
                <div className="bg-bg-elevated p-6 rounded-xl border border-brand-border shadow-sm flex flex-col justify-between gap-4">
                    <div>
                        <h3 className="font-bold text-text-primary mb-3">Section Details</h3>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2 pb-2">
                            <p className="text-text-secondary text-sm">Section: <span className="text-text-primary font-medium">{asset.section}</span></p>
                            {!can_update_location ? (
                                <button 
                                    className="text-text-secondary/50 text-sm font-medium text-left cursor-not-allowed min-h-[32px] py-1 flex items-center gap-1.5" 
                                    title="Permission restricted"
                                    disabled
                                >
                                    Change Section <span className="text-[10px] bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Blocked</span>
                                </button>
                            ) : (
                                <button onClick={() => { setIsModalOpen(true); fetchSections(); }} className="text-brand-gold text-sm font-medium hover:underline text-left cursor-pointer min-h-[32px] py-1">Change Section</button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Asset Photo Card */}
                <div className="bg-bg-elevated p-6 rounded-xl border border-brand-border shadow-sm flex flex-col justify-between gap-4">
                    <div>
                        <h3 className="font-bold text-text-primary mb-3 flex items-center gap-1.5">
                            <Camera size={16} className="text-brand-gold" /> Asset Photo
                        </h3>
                        {uploadingPhoto ? (
                            <div className="border border-brand-gold/30 rounded-lg h-36 flex flex-col items-center justify-center bg-bg-base text-brand-gold text-xs">
                                <span className="animate-spin mb-2 text-lg">⏳</span>
                                <span>Uploading image...</span>
                            </div>
                        ) : (asset as any).photo_url ? (
                            <div className="relative group rounded-lg overflow-hidden border border-brand-border h-36 bg-bg-base flex items-center justify-center shadow-inner">
                                <img src={(asset as any).photo_url} alt={asset.asset_name} className="h-full w-full object-cover" />
                            </div>
                        ) : (
                            <div className="border border-dashed border-brand-border rounded-lg h-36 flex flex-col items-center justify-center bg-bg-base text-text-secondary text-xs">
                                <Camera size={24} className="mb-2 text-text-secondary/50" />
                                <span>No Asset Photograph</span>
                            </div>
                        )}
                        <div className="mt-3">
                            <label className="block text-[10px] uppercase font-bold text-text-secondary tracking-wider mb-1">Upload New Photo</label>
                            <input 
                              type="file" 
                              accept="image/*" 
                              capture="environment" 
                              onChange={(e) => handleFileChange(e, asset.id)}
                              className="block w-full text-xs text-text-secondary file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-brand-gold file:text-white file:text-xs file:font-semibold hover:file:bg-brand-gold/90 transition-all cursor-pointer"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Service Logs / Tickets History Section */}
            <section className="bg-bg-elevated p-6 rounded-xl border border-brand-border shadow-sm">
              <h2 className="font-bold text-text-primary mb-4 text-base border-b border-brand-border pb-2">Active Service & Maintenance Tickets</h2>
              {tickets.length === 0 ? (
                <p className="text-sm text-text-secondary text-center py-6">No service tickets logged for this equipment asset.</p>
              ) : (
                <div className="space-y-3">
                  {tickets.map(ticket => (
                    <div key={ticket.id} className="p-4 bg-bg-base border border-brand-border rounded-lg flex flex-col sm:flex-row justify-between sm:items-center gap-3 text-xs">
                      <div className="space-y-1">
                        <p className="text-text-primary font-semibold text-sm">{ticket.issue_description}</p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-text-secondary font-mono">
                            <span>Opened: {new Date(ticket.created_at).toLocaleDateString()}</span>
                            {ticket.resolved_at && (
                                <span>Closed: {new Date(ticket.resolved_at).toLocaleDateString()}</span>
                            )}
                        </div>
                        {ticket.resolution_notes && (
                            <div className="mt-2 p-2.5 bg-bg-elevated/50 border border-brand-border/40 rounded-md text-xs">
                                <span className="block font-bold text-text-secondary uppercase text-[9px] mb-0.5">Resolution Notes:</span>
                                <p className="text-text-primary">{ticket.resolution_notes}</p>
                            </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <span className={`px-2.5 py-1 font-bold rounded text-[10px] uppercase tracking-wider ${
                            ticket.status === 'Resolved' 
                              ? 'bg-emerald-500/10 text-emerald-500' 
                              : 'bg-amber-500/10 text-amber-500'
                        }`}>
                            {ticket.status}
                        </span>
                        {ticket.status !== 'Resolved' && isAuthorizedToClose && (
                            <button 
                                onClick={() => { setSelectedTicketId(ticket.id); setIsResolveModalOpen(true); }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs py-1.5 px-3 rounded transition-colors cursor-pointer shadow-sm"
                            >
                                ✔️ Close Ticket
                            </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Modal for adding a ticket (Admins / Ops Managers) */}
            {isTicketModalOpen && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
                <div className="bg-bg-elevated p-6 rounded-xl border border-brand-border w-full max-w-sm shadow-xl space-y-4">
                  <header>
                    <h2 className="text-lg font-bold text-text-primary">Create Service Ticket</h2>
                    <p className="text-xs text-text-secondary">Log a failure, corrective action or maintenance requirement.</p>
                  </header>
                  <form onSubmit={handleSubmitTicket} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1">Issue Details / Notes *</label>
                      <textarea 
                        required
                        rows={3}
                        placeholder="Describe technical checks, maintenance or issues..."
                        value={newTicketIssue} 
                        onChange={(e) => setNewTicketIssue(e.target.value)}
                        className="w-full p-2.5 border border-brand-border rounded-lg bg-bg-base text-text-primary outline-none focus:border-brand-gold text-sm resize-none"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button type="button" onClick={() => setIsTicketModalOpen(false)} className="px-4 py-2 text-sm text-text-secondary hover:bg-bg-base rounded-lg transition-colors cursor-pointer min-h-[44px]">Cancel</button>
                      <button type="submit" disabled={submittingTicket} className="bg-brand-gold text-white px-5 py-2 rounded-lg font-medium text-sm hover:bg-brand-gold/90 transition-colors flex items-center justify-center min-h-[44px] cursor-pointer">
                        {submittingTicket ? 'Saving...' : 'Save Ticket'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Modal for closing a ticket (Technicians) */}
            {isResolveModalOpen && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
                <div className="bg-bg-elevated p-6 rounded-xl border border-brand-border w-full max-w-sm shadow-xl space-y-4">
                  <header>
                    <h2 className="text-lg font-bold text-text-primary">Close Maintenance Ticket</h2>
                    <p className="text-xs text-text-secondary">Verify machinery and upload evidence to finalize.</p>
                  </header>
                  <form onSubmit={handleResolveTicket} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1">Resolution Details *</label>
                      <textarea 
                        required
                        rows={2}
                        placeholder="Resolution actions..."
                        value={resolutionNotes} 
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        className="w-full p-2.5 border border-brand-border rounded-lg bg-bg-base text-text-primary outline-none focus:border-brand-gold text-sm resize-none"
                      />
                    </div>
                    
                    {/* QR Verification Step */}
                    {!qrVerified && (
                        <div className="space-y-2">
                            <label className="block text-xs font-semibold text-text-secondary">Verify QR Code *</label>
                            <div id="qr-reader" className="w-full overflow-hidden rounded-lg border border-brand-border" />
                            <button type="button" onClick={() => {
                                setIsScanning(true);
                                const scanner = new Html5QrcodeScanner("qr-reader", {
                                    fps: 10,
                                    qrbox: { width: 220, height: 220 },
                                    aspectRatio: 1.0,
                                    videoConstraints: {
                                        facingMode: { exact: "environment" },
                                        width: { ideal: 1920 },
                                        height: { ideal: 1080 },
                                        focusMode: "continuous"
                                    } as any
                                }, false);
                                scanner.render((decodedText) => {
                                    if(decodedText === asset?.qr_code) {
                                        setQrVerified(true);
                                        setScannedQr(decodedText);
                                        scanner.clear();
                                    } else {
                                        toast.error("Verification Failed: Scanned QR does not match this asset");
                                    }
                                }, (err: any) => {
                                    if (typeof err === 'string' && (err.includes("NotFoundException") || err.includes("No MultiFormat Readers"))) return;
                                    console.error(err);
                                    if (typeof err !== 'string' && err?.name === 'NotAllowedError') {
                                        toast.error("Camera permission denied. Please allow camera access in your browser settings.");
                                    } else {
                                        toast.error("Error accessing camera. Please try again.");
                                    }
                                });
                            }} className="w-full py-2 bg-brand-gold text-white text-xs font-medium rounded-lg">Start Scanning</button>
                        </div>
                    )}
                    {qrVerified && <p className="text-emerald-500 text-xs font-bold flex items-center gap-1"><CheckCircle2 size={12}/> QR Code Verified</p>}

                    {/* Photo Upload Step */}
                    {qrVerified && (
                         <div className="space-y-2">
                             <label className="block text-xs font-semibold text-text-secondary">📸 Photo Evidence *</label>
                             <input type="file" accept="image/*" capture="environment" onChange={(e) => {
                                 if(!e.target.files || e.target.files.length === 0) return;
                                 setPhotoFile(e.target.files[0]);
                             }} className="w-full text-sm text-text-secondary border border-brand-border rounded-lg p-2" />
                             {photoFile && (
                                <div className="mt-2 border border-brand-border p-2 rounded-lg bg-bg-base/50">
                                    <p className="text-xs text-emerald-500 font-bold mb-1">📷 Photo Selected</p>
                                    <img src={URL.createObjectURL(photoFile)} className="h-20 w-full object-cover rounded" alt="Evidence" />
                                </div>
                             )}
                         </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                      <button type="button" onClick={() => { setIsResolveModalOpen(false); setSelectedTicketId(null); setQrVerified(false); setPhotoFile(null); }} className="px-4 py-2 text-sm text-text-secondary hover:bg-bg-base rounded-lg transition-colors cursor-pointer min-h-[44px]">Cancel</button>
                      <button type="submit" disabled={submittingResolution || !qrVerified || !photoFile} className="bg-emerald-600 disabled:opacity-50 text-white px-5 py-2 rounded-lg font-medium text-sm hover:bg-emerald-700 transition-colors flex items-center justify-center min-h-[44px] cursor-pointer">
                        {submittingResolution ? 'Saving...' : 'Resolve Ticket'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Modal for editing section/location */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
                    <div className="bg-bg-elevated p-6 rounded-xl border border-brand-border w-full max-w-sm shadow-xl">
                        <h2 className="text-lg font-bold mb-4 text-text-primary">Update Machine Details</h2>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-text-secondary mb-1">Target Section *</label>
                                <select 
                                    value={selectedSection} 
                                    onChange={(e) => setSelectedSection(e.target.value)}
                                    className="w-full p-2.5 min-h-[44px] border border-brand-border rounded-lg bg-bg-base text-text-primary outline-none focus:border-brand-gold text-sm cursor-pointer font-medium"
                                >
                                    {sections.map(s => <option key={s.id} value={s.section_name}>{s.section_name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-text-secondary mb-1">Asset Photograph</label>
                                <div className="border border-dashed border-brand-border rounded-lg p-4 bg-bg-base/50">
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        capture="environment" 
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) {
                                                setPendingMachinePhoto(e.target.files[0]);
                                            }
                                        }}
                                        className="block w-full text-xs text-text-secondary file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-brand-gold file:text-white file:text-xs file:font-semibold hover:file:bg-brand-gold/90 transition-all cursor-pointer"
                                    />
                                    {pendingMachinePhoto && (
                                        <div className="mt-2 flex items-center gap-2 text-emerald-500 text-[10px] font-bold uppercase tracking-wider">
                                            <CheckCircle2 size={12} /> Photo captured & ready for upload
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-6">
                            <button onClick={() => { setIsModalOpen(false); setPendingMachinePhoto(null); }} className="px-4 py-2.5 min-h-[44px] text-text-secondary hover:bg-bg-base rounded-lg cursor-pointer text-sm">Cancel</button>
                            <button onClick={handleSave} disabled={saving} className="bg-brand-gold text-white px-5 py-2.5 min-h-[44px] rounded-lg font-medium hover:bg-brand-gold/90 transition-colors flex items-center justify-center text-sm cursor-pointer min-w-[120px]">
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

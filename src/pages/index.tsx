import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Asset, Customer, Section } from '../types';
import { Html5Qrcode } from 'html5-qrcode';
import { toast } from 'sonner';
import { getAssetByQR, getSections, updateAssetSection } from '../api/assetApi';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

export function StockPage() {
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detectedTable, setDetectedTable] = useState<'stock' | 'inventory' | 'local'>('local');

  // Form states
  const [formItem, setFormItem] = useState('');
  const [formQty, setFormQty] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');

  const resetForm = () => {
    setFormItem('');
    setFormQty('');
    setFormNotes('');
  };

  useEffect(() => {
    const detectAndFetch = async () => {
      setLoading(true);
      try {
        // 1. Try 'stock'
        const { data: stockData, error: stockError } = await supabase
          .from('stock')
          .select('*')
          .order('id', { ascending: false });
        
        if (!stockError && stockData) {
          setStockItems(stockData);
          setDetectedTable('stock');
          setLoading(false);
          return;
        }

        // 2. Try 'inventory'
        const { data: invData, error: invError } = await supabase
          .from('inventory')
          .select('*')
          .order('id', { ascending: false });

        if (!invError && invData) {
          setStockItems(invData);
          setDetectedTable('inventory');
          setLoading(false);
          return;
        }

        // 3. Fallback to localStorage
        const localData = localStorage.getItem('local_stock');
        if (localData) {
          setStockItems(JSON.parse(localData));
        } else {
          const initialMock = [
            { id: 1, item: 'Hydraulic Piston H2', sku: 'SKU-77291', quantity: 18, notes: 'Department B supply' },
            { id: 2, item: 'Vibration Gasket', sku: 'SKU-10293', quantity: 120, notes: 'Main maintenance stores' },
            { id: 3, item: 'Pressure Sensor P10', sku: 'SKU-88231', quantity: 45, notes: 'Replacement spares' },
            { id: 4, item: 'Electric Motor 5kW', sku: 'SKU-54412', quantity: 3, notes: 'High-value reserve' }
          ];
          localStorage.setItem('local_stock', JSON.stringify(initialMock));
          setStockItems(initialMock);
        }
        setDetectedTable('local');
      } catch (err) {
        console.error('Error during stock auto-detection:', err);
        setDetectedTable('local');
      } finally {
        setLoading(false);
      }
    };

    detectAndFetch();
  }, []);

  const getItemName = (item: any) => {
    return item['Item Name'] || item['item_name'] || item['item'] || item['Item'] || item['name'] || 'Unnamed Item';
  };

  const getSKU = (item: any) => {
    return item['SKU'] || item['sku'] || item['Serial#'] || `SKU-00${item.id || 1}`;
  };

  const getQuantity = (item: any) => {
    const q = item['Quantity'] || item['quantity'] || item['Quantity Received'] || item['quantity_received'];
    return q !== undefined ? Number(q) : 0;
  };

  const getNotes = (item: any) => {
    return item['Notes'] || item['notes'] || 'No notes';
  };

  const handleReceiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formItem.trim() || !formQty) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setSaving(true);
    const qtyNum = parseInt(formQty, 10);
    const generatedSku = `SKU-${Math.floor(10000 + Math.random() * 90000)}`;

    if (detectedTable !== 'local') {
      try {
        let itemKey = 'item';
        let qtyKey = 'quantity';
        let notesKey = 'notes';
        let skuKey = 'sku';

        if (stockItems.length > 0) {
          const firstKeys = Object.keys(stockItems[0]);
          const foundItemKey = firstKeys.find(k => k.toLowerCase() === 'item' || k.toLowerCase() === 'item name' || k.toLowerCase() === 'item_name');
          if (foundItemKey) itemKey = foundItemKey;

          const foundQtyKey = firstKeys.find(k => k.toLowerCase() === 'quantity' || k.toLowerCase() === 'quantity received' || k.toLowerCase() === 'quantity_received' || k.toLowerCase() === 'qty');
          if (foundQtyKey) qtyKey = foundQtyKey;

          const foundNotesKey = firstKeys.find(k => k.toLowerCase() === 'notes' || k.toLowerCase() === 'note' || k.toLowerCase() === 'description');
          if (foundNotesKey) notesKey = foundNotesKey;

          const foundSkuKey = firstKeys.find(k => k.toLowerCase() === 'sku' || k.toLowerCase() === 'item code' || k.toLowerCase() === 'sku_code');
          if (foundSkuKey) skuKey = foundSkuKey;
        } else {
          itemKey = 'item_name';
          qtyKey = 'quantity';
          notesKey = 'notes';
          skuKey = 'sku';
        }

        const insertData = {
          [itemKey]: formItem,
          [qtyKey]: qtyNum,
          [notesKey]: formNotes,
          [skuKey]: generatedSku
        };

        const { error } = await supabase
          .from(detectedTable === 'stock' ? 'stock' : 'inventory')
          .insert([insertData]);

        if (error) {
          // Try inserting standard fallback object if customized key matching failed
          const fallbackInsert = {
            item: formItem,
            item_name: formItem,
            'Item Name': formItem,
            quantity: qtyNum,
            Quantity: qtyNum,
            notes: formNotes,
            Notes: formNotes,
            sku: generatedSku,
            SKU: generatedSku
          };
          const { error: fbErr } = await supabase
            .from(detectedTable === 'stock' ? 'stock' : 'inventory')
            .insert([fallbackInsert]);
          
          if (fbErr) throw fbErr;
        }

        toast.success("Stock received successfully!");
        setIsModalOpen(false);
        resetForm();

        // Refresh
        const { data: refreshed } = await supabase
          .from(detectedTable === 'stock' ? 'stock' : 'inventory')
          .select('*')
          .order('id', { ascending: false });
        if (refreshed) {
          setStockItems(refreshed);
        }
      } catch (err: any) {
        toast.error(err.message || "Error inserting stock data");
      } finally {
        setSaving(false);
      }
    } else {
      const newId = stockItems.length > 0 ? Math.max(...stockItems.map(i => i.id)) + 1 : 1;
      const newItem = {
        id: newId,
        item: formItem,
        item_name: formItem,
        'Item Name': formItem,
        sku: generatedSku,
        SKU: generatedSku,
        quantity: qtyNum,
        Quantity: qtyNum,
        notes: formNotes,
        Notes: formNotes
      };
      const updated = [newItem, ...stockItems];
      localStorage.setItem('local_stock', JSON.stringify(updated));
      setStockItems(updated);
      toast.success("Stock received!");
      setIsModalOpen(false);
      resetForm();
      setSaving(false);
    }
  };

  const filteredItems = stockItems.filter(item => {
    const name = getItemName(item).toLowerCase();
    const sku = getSKU(item).toLowerCase();
    const notes = getNotes(item).toLowerCase();
    const query = searchTerm.toLowerCase();
    return name.includes(query) || sku.includes(query) || notes.includes(query);
  });

  return (
    <div className="p-8">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Stock Inventory</h1>
          <p className="text-text-secondary">Manage and track your stock levels across departments.</p>
        </div>
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="bg-brand-gold text-white px-5 py-2 rounded-lg font-medium hover:bg-brand-gold/90 transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
        >
          <span className="text-lg font-bold">+</span> Receive Stock
        </button>
      </header>

      {/* Toolbar / Search */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-stretch">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Search stock by name, SKU or notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-3 pr-4 py-2 border border-brand-border rounded-lg bg-bg-elevated text-text-primary placeholder:text-text-secondary outline-none focus:border-brand-gold text-sm"
          />
        </div>
        <div className="flex items-center text-xs text-text-secondary font-mono bg-bg-elevated px-3 py-1.5 rounded-lg border border-brand-border self-start">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-2"></span>
          Mode: {detectedTable === 'local' ? 'Local Storage (Offline)' : `Supabase Table: "${detectedTable}"`}
        </div>
      </div>

      {loading ? (
        <div className="bg-bg-elevated p-12 rounded-xl border border-brand-border text-center text-text-secondary">
          <div className="w-8 h-8 border-4 border-brand-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          Loading stock items...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-bg-elevated py-16 px-6 rounded-xl border border-brand-border text-center">
          <p className="text-text-secondary max-w-md mx-auto mb-4">No stock items match your criteria. Add new stock using the button above.</p>
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="text-brand-gold text-sm font-medium hover:underline">
              Clear search filter
            </button>
          )}
        </div>
      ) : (
        <div className="bg-bg-elevated rounded-xl border border-brand-border overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-brand-border text-text-secondary text-sm bg-bg-base/30">
                <th className="p-4 font-semibold">SKU Code</th>
                <th className="p-4 font-semibold">Item & Description</th>
                <th className="p-4 font-semibold">Status / Notes</th>
                <th className="p-4 font-semibold text-right">In Stock Qty</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item, index) => {
                const qty = getQuantity(item);
                const isLow = qty < 10;
                return (
                  <tr key={item.id || index} className="border-b border-brand-border hover:bg-bg-base/40 transition-colors">
                    <td className="p-4 font-mono text-xs text-text-secondary">{getSKU(item)}</td>
                    <td className="p-4">
                      <div className="font-semibold text-text-primary text-sm">{getItemName(item)}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-text-secondary line-clamp-1">{getNotes(item)}</span>
                        {isLow && (
                          <span className="text-[10px] text-amber-500 font-medium inline-flex items-center gap-1 mt-0.5">
                            ⚠️ Low Stock Warning
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-semibold ${
                        isLow ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'
                      }`}>
                        {qty} units
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Receive Stock Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-bg-elevated p-6 rounded-xl border border-brand-border w-full max-w-md shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <header className="mb-4">
              <h2 className="text-lg font-bold text-text-primary">Receive New Stock</h2>
              <p className="text-xs text-text-secondary">Add new parts or equipment shipments to inventory.</p>
            </header>
            
            <form onSubmit={handleReceiveSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Item Description / Name *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Compression Valve 12mm"
                  value={formItem} 
                  onChange={(e) => setFormItem(e.target.value)}
                  className="w-full p-2.5 border border-brand-border rounded-lg bg-bg-base text-text-primary placeholder:text-text-secondary outline-none focus:border-brand-gold text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Quantity Received *</label>
                <input 
                  type="number" 
                  required
                  min="1"
                  placeholder="e.g. 50"
                  value={formQty} 
                  onChange={(e) => setFormQty(e.target.value)}
                  className="w-full p-2.5 border border-brand-border rounded-lg bg-bg-base text-text-primary placeholder:text-text-secondary outline-none focus:border-brand-gold text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Notes / Supplier Details</label>
                <textarea 
                  rows={3}
                  placeholder="Specify department assignment, batch code or supplier reference..."
                  value={formNotes} 
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full p-2.5 border border-brand-border rounded-lg bg-bg-base text-text-primary placeholder:text-text-secondary outline-none focus:border-brand-gold text-sm resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-brand-border">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)} 
                  className="px-4 py-2 text-sm text-text-secondary hover:bg-bg-base rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={saving} 
                  className="bg-brand-gold text-white px-5 py-2 rounded-lg font-medium text-sm hover:bg-brand-gold/90 transition-colors flex items-center justify-center min-w-[100px] cursor-pointer"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : 'Save Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch sections once on mount
  useEffect(() => {
    const fetchSections = async () => {
      try {
        const { data, error } = await supabase
          .from('section')
          .select('id, section_name')
          .order('section_name', { ascending: true });
        
        if (error) {
          toast.error(`Failed to load sections: ${error.message}`);
        } else if (data) {
          setSections(data as Section[]);
        }
      } catch (err: any) {
        console.error('Error fetching sections:', err);
      }
    };
    fetchSections();
  }, []);

  // Fetch assets whenever selectedSection changes
  useEffect(() => {
    const fetchAssets = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('fam')
          .select('id, "Asset Name", "Serial#", "QR Code", "Current Location"');

        if (selectedSection) {
          query = query.eq('Current Location', selectedSection);
        }

        const { data, error } = await query;
        if (error) {
          toast.error(`Failed to fetch assets: ${error.message}`);
        } else if (data) {
          setAssets(data as Asset[]);
        }
      } catch (err: any) {
        toast.error(err.message || 'Error fetching assets from Supabase');
      } finally {
        setLoading(false);
      }
    };

    fetchAssets();
  }, [selectedSection]);

  return (
    <div className="p-8">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Assets</h1>
          <p className="text-text-secondary">List and manage your enterprise equipment and machinery.</p>
        </div>

        {/* Section Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <label htmlFor="section-filter" className="text-xs font-bold text-text-secondary tracking-wider uppercase">
            Filter by Section:
          </label>
          <select
            id="section-filter"
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="p-2 border border-brand-border rounded-lg bg-bg-elevated text-text-primary placeholder:text-text-secondary outline-none focus:border-brand-gold text-sm cursor-pointer min-w-[200px]"
          >
            <option value="">All Sections</option>
            {sections.map((section) => (
              <option key={section.id} value={section.section_name}>
                {section.section_name}
              </option>
            ))}
          </select>
        </div>
      </header>

      {loading ? (
        <div className="bg-bg-elevated p-12 rounded-xl border border-brand-border text-center text-text-secondary">
          <div className="w-8 h-8 border-4 border-brand-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          Loading assets...
        </div>
      ) : assets.length === 0 ? (
        <div className="bg-bg-elevated py-16 px-6 rounded-xl border border-brand-border text-center">
          <p className="text-text-secondary max-w-sm mx-auto mb-4">No assets found in the selected section.</p>
          {selectedSection && (
            <button onClick={() => setSelectedSection('')} className="text-brand-gold text-sm font-medium hover:underline cursor-pointer">
              Clear section filter
            </button>
          )}
        </div>
      ) : (
        <div className="bg-bg-elevated rounded-xl border border-brand-border overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-brand-border text-text-secondary text-xs font-bold tracking-wider uppercase bg-bg-base/20">
                <th className="p-4">S/N</th>
                <th className="p-4">QR</th>
                <th className="p-4">Machine Name</th>
                <th className="p-4">Section</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <tr key={asset.id} className="border-b border-brand-border hover:bg-bg-base cursor-pointer" onClick={() => navigate(`/assets/${asset.id}`)}>
                  <td className="p-4 font-mono text-xs text-text-secondary">{asset['Serial#'] || 'N/A'}</td>
                  <td className="p-4 font-mono text-xs text-text-secondary">{asset['QR Code'] || 'N/A'}</td>
                  <td className="p-4 font-semibold text-text-primary text-sm">{asset['Asset Name'] || 'N/A'}</td>
                  <td className="p-4">
                    <span className="inline-block px-2.5 py-1 rounded-md text-xs font-medium bg-brand-gold/10 text-brand-gold">
                      {asset['Current Location'] || 'N/A'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function AssetDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const [asset, setAsset] = useState<Asset | null>(null);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [sections, setSections] = useState<Section[]>([]);
    const [selectedSection, setSelectedSection] = useState('');
    const [saving, setSaving] = useState(false);
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const fetchAssetDetails = async () => {
            try {
                const { data, error } = await supabase
                    .from('fam')
                    .select('*')
                    .eq('id', id)
                    .single();
                if (error) {
                    toast.error(error.message);
                } else if (data) {
                    setAsset(data as Asset);
                    if (searchParams.get('action') === 'update_location') {
                        setIsModalOpen(true);
                    }
                }
            } catch (err: any) {
                toast.error(err.message || 'Error fetching asset details');
            } finally {
                setLoading(false);
            }
        };
        if (id) {
            fetchAssetDetails();
        }
    }, [id, searchParams]);

    useEffect(() => {
        const fetchSections = async () => {
            try {
                const { data, error } = await supabase
                    .from('section')
                    .select('id, section_name');
                if (error) {
                    toast.error(error.message);
                } else if (data) {
                    setSections(data as Section[]);
                    if (asset && asset['Current Location']) {
                        setSelectedSection(asset['Current Location']);
                    } else if (data.length > 0) {
                        setSelectedSection(data[0].section_name);
                    }
                }
            } catch (err: any) {
                toast.error(err.message || 'Error fetching sections');
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
            const { error } = await supabase
                .from('fam')
                .update({ 'Current Location': selectedSection })
                .eq('id', asset.id);

            if (error) {
                toast.error(error.message);
            } else {
                setAsset(prev => prev ? { ...prev, 'Current Location': selectedSection } : null);
                toast.success("Location updated");
                setIsModalOpen(false);
            }
        } catch (err: any) {
            toast.error(err.message || 'Error updating location');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8">Loading asset details...</div>;
    if (!asset) return <div className="p-8">Asset not found</div>;

    return (
        <div className="p-8 max-w-4xl relative">
            <h1 className="text-3xl font-bold mb-6 text-text-primary">{asset['Asset Name']}</h1>
            <div className="grid grid-cols-2 gap-6">
                <div className="bg-bg-elevated p-6 rounded-xl border border-brand-border">
                    <h3 className="font-bold text-text-primary mb-3">Identifiers</h3>
                    <p className="text-text-secondary text-sm mb-1">S/N: <span className="text-text-primary">{asset['Serial#']}</span></p>
                    <p className="text-text-secondary text-sm">QR Code: <span className="text-text-primary">{asset['QR Code']}</span></p>
                </div>
                <div className="bg-bg-elevated p-6 rounded-xl border border-brand-border">
                    <h3 className="font-bold text-text-primary mb-3">Location & Customer</h3>
                    <p className="text-text-secondary text-sm mb-1">Location: <span className="text-text-primary">{asset['Current Location']}</span></p>
                    <button onClick={() => setIsModalOpen(true)} className="text-brand-gold text-sm font-medium hover:underline mb-3">Change Section</button>
                    <p className="text-text-secondary text-sm mb-3">Customer: <span className="text-text-primary">{asset['Current Customer Name']}</span></p>
                    <Link to={`/customers/${asset['C.Code']}`} className="text-brand-gold text-sm font-medium hover:underline">View Customer Details</Link>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-bg-elevated p-6 rounded-xl border border-brand-border w-full max-w-sm">
                        <h2 className="text-lg font-bold mb-4">Update Asset Location</h2>
                        <select 
                            value={selectedSection} 
                            onChange={(e) => setSelectedSection(e.target.value)}
                            className="w-full p-2 border border-brand-border rounded-lg mb-4"
                        >
                            {sections.map(s => <option key={s.id} value={s.section_name}>{s.section_name}</option>)}
                        </select>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-text-secondary hover:bg-bg-base rounded-lg">Cancel</button>
                            <button onClick={handleSave} disabled={saving} className="bg-brand-gold text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-gold/90 transition-colors">
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export function CustomerDetailsPage() {
    const { code } = useParams<{ code: string }>();
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCustomer = async () => {
            if (!code) {
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                // List of tables to query in order
                const tables = ['kzn_customers', 'jhb_customers', 'cpt_customers'];
                let foundCustomer: any = null;

                for (const table of tables) {
                    const { data, error } = await supabase
                        .from(table)
                        .select('*')
                        .eq('A/C Code', code)
                        .maybeSingle();

                    if (error) {
                        console.error(`Error querying ${table}:`, error.message);
                        continue;
                    }

                    if (data) {
                        foundCustomer = data;
                        break; // Stop querying as soon as a match is found
                    }
                }

                if (foundCustomer) {
                    setCustomer(foundCustomer as Customer);
                } else {
                    setCustomer(null);
                }
            } catch (err: any) {
                toast.error(err.message || 'Error loading customer details');
            } finally {
                setLoading(false);
            }
        };

        fetchCustomer();
    }, [code]);

    if (loading) return <div className="p-8">Loading customer details...</div>;
    if (!customer) return <div className="p-8">Customer not found ({code})</div>;

    const customerName = customer['Customer Name'] || 'N/A';
    const acCode = customer['A/C Code'] || code || 'N/A';
    const telephone = customer['Telephone-1'] || 'N/A';
    const email = customer['Email-1'] || 'N/A';
    const shipTo = customer['Ship To'] || 'N/A';

    return (
        <div className="p-8 max-w-2xl">
            <h1 className="text-3xl font-bold mb-6 text-text-primary">{customerName}</h1>
            <div className="bg-bg-elevated p-8 rounded-xl border border-brand-border space-y-4">
                <p className="text-text-secondary">A/C Code: <span className="text-text-primary font-medium">{acCode}</span></p>
                <p className="text-text-secondary">Telephone: <span className="text-text-primary font-medium">{telephone}</span></p>
                <p className="text-text-secondary">Email: <span className="text-text-primary font-medium">{email}</span></p>
                <p className="text-text-secondary">Ship To: <span className="text-text-primary font-medium">{shipTo}</span></p>
            </div>
        </div>
    );
}



export function ScannerPage() {
  const navigate = useNavigate();
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const isProcessingRef = React.useRef(false);

  useEffect(() => {
    let isMounted = true;
    const html5QrCode = new Html5Qrcode("reader");
    let isScanning = false;

    const startPromise = html5QrCode.start(
      { facingMode: "environment" },
      {
        fps: 10,
        qrbox: { width: 250, height: 250 }
      },
      async (decodedText) => {
        // Prevent concurrent processing immediately using the ref lock
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;
        setIsProcessing(true);

        try {
          if (html5QrCode.isScanning) {
            html5QrCode.pause(true);
          }
        } catch (e) {
          console.warn("Could not pause scanner:", e);
        }
        
        const loadingToastId = toast.loading("Checking database for asset: " + decodedText);

        try {
          // Add a tiny delay to let the camera pause settle
          await new Promise(resolve => setTimeout(resolve, 300));

          const { data, error } = await supabase
            .from('fam')
            .select('id')
            .eq('QR Code', decodedText)
            .maybeSingle();

          toast.dismiss(loadingToastId);

          if (error) {
            toast.error(error.message);
            setIsProcessing(false);
            isProcessingRef.current = false;
            setTimeout(() => {
              if (isMounted) {
                try {
                  if (html5QrCode.isScanning) {
                    html5QrCode.resume();
                  }
                } catch (e) {
                  console.warn("Could not resume scanner:", e);
                }
              }
            }, 2000);
          } else if (data) {
            toast.success("Asset found!");
            try {
              if (html5QrCode.isScanning) {
                await html5QrCode.stop();
              }
            } catch (stopErr) {
              console.warn("Could not stop camera gracefully before navigating:", stopErr);
            }
            setTimeout(() => {
              if (isMounted) {
                navigate(`/assets/${data.id}`);
              }
            }, 800);
          } else {
            toast.error("Asset not found in database");
            setIsProcessing(false);
            isProcessingRef.current = false;
            setTimeout(() => {
              if (isMounted) {
                try {
                  if (html5QrCode.isScanning) {
                    html5QrCode.resume();
                  }
                } catch (e) {
                  console.warn("Could not resume scanner:", e);
                }
              }
            }, 2000);
          }
        } catch (err: any) {
          toast.dismiss(loadingToastId);
          toast.error(err.message || "Error locating asset");
          setIsProcessing(false);
          isProcessingRef.current = false;
          setTimeout(() => {
            if (isMounted) {
              try {
                if (html5QrCode.isScanning) {
                  html5QrCode.resume();
                }
              } catch (e) {
                console.warn("Could not resume scanner:", e);
              }
            }
          }, 2000);
        }
      },
      (errorMessage) => {
        // Debug output or passive scanner feedback
      }
    ).then(() => {
      isScanning = true;
    }).catch(err => {
      console.error("Camera access error:", err);
      if (isMounted) {
        setErrorStatus("Camera access denied or could not be initialized.");
      }
    });

    return () => {
      isMounted = false;
      startPromise.then(() => {
        try {
          if (isScanning || html5QrCode.isScanning) {
            html5QrCode.stop()
              .then(() => {
                console.log("Scanner stopped successfully");
              })
              .catch(err => {
                console.log("Scanner stop error on unmount:", err);
              });
          }
        } catch (err) {
          console.log("Error inside scanner cleanup stop:", err);
        }
      }).catch(err => {
        console.log("Scanner failed to start, no need to stop:", err);
      });
    };
  }, [navigate]);

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">QR Code Scanner</h1>
        <p className="text-text-secondary">Scan a physical machinery or equipment asset QR label to query its details.</p>
      </header>

      <div className="bg-bg-elevated p-6 rounded-xl border border-brand-border">
        {errorStatus ? (
          <div className="p-8 text-center text-red-500 font-medium">
            <p className="mb-2">⚠️ {errorStatus}</p>
            <p className="text-sm text-text-secondary">Please check your camera permissions and refresh the page.</p>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-lg">
            {/* Viewfinder overlay */}
            <div className={`absolute inset-0 border-2 border-brand-gold/10 pointer-events-none rounded-lg z-10 flex items-center justify-center transition-opacity duration-300 ${isProcessing ? 'opacity-0' : 'opacity-100'}`}>
              <div className="w-[260px] h-[260px] border-2 border-dashed border-brand-gold relative flex items-center justify-center rounded-lg">
                <span className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-brand-gold -mt-0.5 -ml-0.5 rounded-tl"></span>
                <span className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-brand-gold -mt-0.5 -mr-0.5 rounded-tr"></span>
                <span className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-brand-gold -mb-0.5 -ml-0.5 rounded-bl"></span>
                <span className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-brand-gold -mb-0.5 -mr-0.5 rounded-br"></span>
                
                {/* Laser animation */}
                <div className="w-[240px] h-0.5 bg-brand-gold absolute animate-bounce opacity-70"></div>
              </div>
            </div>

            {/* html5-qrcode element */}
            <div className={`transition-opacity duration-300 ${isProcessing ? 'opacity-0' : 'opacity-100'}`}>
              <div id="reader" className="overflow-hidden rounded-lg bg-black"></div>
            </div>
            
            {isProcessing && (
              <div className="absolute inset-0 bg-bg-elevated/90 backdrop-blur-sm flex items-center justify-center z-20 rounded-lg">
                <div className="text-center">
                  <div className="w-10 h-10 border-4 border-brand-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-text-primary font-medium animate-pulse">Freezing camera...</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
export function SettingsPage() {
  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
        <p className="text-text-secondary">Manage your account and platform preferences.</p>
      </header>
      <div className="space-y-4">
        <div className="bg-bg-elevated p-6 rounded-xl border border-brand-border text-text-primary">Profile Settings</div>
        <div className="bg-bg-elevated p-6 rounded-xl border border-brand-border text-text-primary">Notification Preferences</div>
      </div>
    </div>
  );
}
export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await login(email, password);
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Logged in successfully!');
      navigate('/');
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-bg-base p-4">
      <form onSubmit={handleLogin} className="bg-bg-elevated p-8 rounded-xl border border-brand-border w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-text-primary">Sign In</h1>
        <div className="space-y-4">
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2 border border-brand-border rounded-lg" required />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-2 border border-brand-border rounded-lg" required />
          <button type="submit" disabled={loading} className="w-full bg-brand-gold text-white p-2 rounded-lg hover:bg-brand-gold/90 transition-colors">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </div>
      </form>
    </div>
  );
}


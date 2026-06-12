import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Machine, Customer, Section } from '../types';
import { Html5Qrcode } from 'html5-qrcode';
import { toast } from 'sonner';
import { getAssetByQR, getSections, updateAssetSection } from '../api/assetApi';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

const MOCK_SECTIONS: Section[] = [
  { id: 'sec-1', section_name: 'Workshop A' },
  { id: 'sec-2', section_name: 'Main Storage Room' },
  { id: 'sec-3', section_name: 'Testing Bay 4' },
  { id: 'sec-4', section_name: 'Dispatch Area' }
];

const MOCK_MACHINES: Machine[] = [
  {
    id: 'ast-1',
    asset_name: 'Industrial CNC Miller',
    serial_number: 'CNCM-9921A',
    qr_code: 'QR-CNC-99',
    section: 'Workshop A'
  },
  {
    id: 'ast-2',
    asset_name: 'Pneumatic Drill Unit',
    serial_number: 'PDU-1029B',
    qr_code: 'QR-PDU-10',
    section: 'Workshop A'
  },
  {
    id: 'ast-3',
    asset_name: 'Hydraulic Lift Stage 2',
    serial_number: 'HLS-5531X',
    qr_code: 'QR-HLS-55',
    section: 'Main Storage Room'
  },
  {
    id: 'ast-4',
    asset_name: 'Heavy Rotary Compressor',
    serial_number: 'HRC-8321W',
    qr_code: 'QR-HRC-83',
    section: 'Testing Bay 4'
  }
];

const MOCK_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    'A/C Code': 'CUST-001',
    'Customer Name': 'AeroParts Ltd',
    'Telephone-1': '+27 11 555 1200',
    'Email-1': 'support@aeroparts.co.za',
    'Ship To': 'Plot 42, Aero Space Industrial Park, Johannesburg'
  },
  {
    id: 'cust-2',
    'A/C Code': 'CUST-002',
    'Customer Name': 'MiningCorp',
    'Telephone-1': '+27 14 888 3400',
    'Email-1': 'logistics@miningcorp.co.za',
    'Ship To': 'Shaft 3, Rustenburg Platinum Reef'
  },
  {
    id: 'cust-3',
    'A/C Code': 'CUST-003',
    'Customer Name': 'Apex Logistics',
    'Telephone-1': '+27 21 444 8900',
    'Email-1': 'inbounds@apexlogistics.co.za',
    'Ship To': 'Container Terminal B, Cape Town Port'
  }
];

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
    <div className="p-4 md:p-8">
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Stock Inventory</h1>
          <p className="text-text-secondary">Manage and track your stock levels across departments.</p>
        </div>
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="bg-brand-gold text-white px-5 py-2.5 min-h-[44px] rounded-lg font-medium hover:bg-brand-gold/90 transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer whitespace-nowrap self-start sm:self-auto"
        >
          <span className="text-lg font-bold">+</span> Receive Stock
        </button>
      </header>

      {/* Toolbar / Search */}
      <div className="mb-6 flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search stock by name, SKU or notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-3 pr-4 py-2.5 min-h-[44px] border border-brand-border rounded-lg bg-bg-elevated text-text-primary placeholder:text-text-secondary outline-none focus:border-brand-gold text-sm"
          />
        </div>
        <div className="flex items-center text-xs text-text-secondary font-mono bg-bg-elevated px-3 py-2 min-h-[36px] rounded-lg border border-brand-border self-start md:self-auto">
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
            <button onClick={() => setSearchTerm('')} className="text-brand-gold text-sm font-medium hover:underline cursor-pointer min-h-[44px] px-4">
              Clear search filter
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Mobile view cards */}
          <div className="block md:hidden space-y-4">
            {filteredItems.map((item, index) => {
              const qty = getQuantity(item);
              const isLow = qty < 10;
              return (
                <div 
                  key={item.id || index} 
                  className="bg-bg-elevated p-4 rounded-xl border border-brand-border flex flex-col gap-3 shadow-sm"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="space-y-1">
                      <span className="font-mono text-[10px] tracking-wider text-text-secondary bg-bg-base px-2 py-0.5 rounded border border-brand-border inline-block">
                        {getSKU(item)}
                      </span>
                      <h3 className="font-bold text-text-primary text-base">
                        {getItemName(item)}
                      </h3>
                    </div>
                    <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-semibold shrink-0 ${
                      isLow ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'
                    }`}>
                      {qty} units
                    </span>
                  </div>

                  <div className="border-t border-brand-border/60 pt-2.5 flex flex-col gap-1">
                    <span className="text-xs text-text-secondary">
                      {getNotes(item)}
                    </span>
                    {isLow && (
                      <span className="text-[10px] text-amber-500 font-medium inline-flex items-center gap-1 mt-1">
                        ⚠️ Low Stock Warning
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop view table */}
          <div className="hidden md:block bg-bg-elevated rounded-xl border border-brand-border overflow-hidden">
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
        </>
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
  const [assets, setAssets] = useState<Machine[]>([]);
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
          console.warn(`Failed to load sections: ${error.message}`);
          loadFallbackSections();
        } else if (data && data.length > 0) {
          setSections(data as Section[]);
          localStorage.setItem('cached_sections', JSON.stringify(data));
        } else {
          loadFallbackSections();
        }
      } catch (err: any) {
        console.warn('Error fetching sections:', err);
        loadFallbackSections();
      }
    };

    const loadFallbackSections = () => {
      const stored = localStorage.getItem('cached_sections');
      if (stored) {
        setSections(JSON.parse(stored));
      } else {
        localStorage.setItem('cached_sections', JSON.stringify(MOCK_SECTIONS));
        setSections(MOCK_SECTIONS);
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
          .from('machines')
          .select('id, serial_number, qr_code, asset_name, section');

        if (selectedSection) {
          query = query.eq('section', selectedSection);
        }

        const { data, error } = await query;
        if (error) {
          console.warn(`Failed to fetch assets: ${error.message}`);
          loadFallbackAssets();
        } else if (data && data.length > 0) {
          if (selectedSection) {
            setAssets(data as Machine[]);
          } else {
            setAssets(data as Machine[]);
            localStorage.setItem('cached_assets', JSON.stringify(data));
          }
        } else {
          loadFallbackAssets();
        }
      } catch (err: any) {
        console.warn('Error fetching assets from Supabase:', err);
        loadFallbackAssets();
      } finally {
        setLoading(false);
      }
    };

    const loadFallbackAssets = () => {
      const stored = localStorage.getItem('cached_assets');
      let allAssets = MOCK_MACHINES;
      if (stored) {
        allAssets = JSON.parse(stored);
      } else {
        localStorage.setItem('cached_assets', JSON.stringify(MOCK_MACHINES));
      }

      if (selectedSection) {
        setAssets(allAssets.filter(a => a.section === selectedSection));
      } else {
        setAssets(allAssets);
      }
    };

    fetchAssets();
  }, [selectedSection]);

  return (
    <div className="p-4 md:p-8">
      <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Assets</h1>
          <p className="text-text-secondary">List and manage your enterprise equipment and machinery.</p>
        </div>

        {/* Section Filter with comfortable touch target height */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label htmlFor="section-filter" className="text-xs font-bold text-text-secondary tracking-wider uppercase whitespace-nowrap">
            Filter by Section:
          </label>
          <select
            id="section-filter"
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="p-2.5 min-h-[44px] h-11 border border-brand-border rounded-lg bg-bg-elevated text-text-primary placeholder:text-text-secondary outline-none focus:border-brand-gold text-sm cursor-pointer min-w-[200px]"
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
            <button onClick={() => setSelectedSection('')} className="text-brand-gold text-sm font-medium hover:underline cursor-pointer min-h-[44px] px-3 flex items-center justify-center mx-auto">
              Clear section filter
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Mobile view cards */}
          <div className="block md:hidden space-y-3">
            {assets.map((asset) => (
              <div
                key={asset.id}
                onClick={() => navigate(`/assets/${asset.id}`)}
                className="bg-bg-elevated p-4 rounded-xl border border-brand-border cursor-pointer hover:bg-bg-base/30 active:scale-[0.99] transition-all flex flex-col gap-2 min-h-[44px]"
              >
                <div className="flex justify-between items-start gap-2">
                  <span className="font-semibold text-text-primary text-base">
                    {asset.asset_name || 'N/A'}
                  </span>
                  <span className="inline-block px-2.5 py-1 rounded-md text-xs font-semibold bg-brand-gold/10 text-brand-gold shrink-0">
                    {asset.section || 'N/A'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary font-mono mt-1 pt-2 border-t border-brand-border/40">
                  <span>S/N: <strong className="text-text-primary font-medium">{asset.serial_number || 'N/A'}</strong></span>
                  <span>QR: <strong className="text-text-primary font-medium">{asset.qr_code || 'N/A'}</strong></span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop view table */}
          <div className="hidden md:block bg-bg-elevated rounded-xl border border-brand-border overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-brand-border text-text-secondary text-xs font-bold tracking-wider uppercase bg-bg-base/20">
                  <th className="p-4">Serial Number</th>
                  <th className="p-4">QR Code</th>
                  <th className="p-4">Asset Name</th>
                  <th className="p-4">Section</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => (
                  <tr key={asset.id} className="border-b border-brand-border hover:bg-bg-base cursor-pointer" onClick={() => navigate(`/assets/${asset.id}`)}>
                    <td className="p-4 font-mono text-xs text-text-secondary">{asset.serial_number || 'N/A'}</td>
                    <td className="p-4 font-mono text-xs text-text-secondary">{asset.qr_code || 'N/A'}</td>
                    <td className="p-4 font-semibold text-text-primary text-sm">{asset.asset_name || 'N/A'}</td>
                    <td className="p-4">
                      <span className="inline-block px-2.5 py-1 rounded-md text-xs font-medium bg-brand-gold/10 text-brand-gold">
                        {asset.section || 'N/A'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export function AssetDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const { can_update_location } = useAuth();
    const [asset, setAsset] = useState<Machine | null>(null);
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
                    .from('machines')
                    .select('*')
                    .eq('id', id)
                    .single();
                if (error) {
                    console.warn(`Failed to fetch asset details: ${error.message}`);
                    loadFallbackAsset();
                } else if (data) {
                    setAsset(data as Machine);
                    if (searchParams.get('action') === 'update_section' || searchParams.get('action') === 'update_location') {
                        setIsModalOpen(true);
                    }
                } else {
                    loadFallbackAsset();
                }
            } catch (err: any) {
                console.warn('Error fetching asset details:', err);
                loadFallbackAsset();
            } finally {
                setLoading(false);
            }
        };

        const loadFallbackAsset = () => {
            const stored = localStorage.getItem('cached_assets');
            let allAssets = MOCK_MACHINES;
            if (stored) {
                allAssets = JSON.parse(stored);
            }
            const found = allAssets.find(a => a.id === id);
            if (found) {
                setAsset(found);
                if (searchParams.get('action') === 'update_section' || searchParams.get('action') === 'update_location') {
                    setIsModalOpen(true);
                }
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
                    console.warn(`Failed to fetch sections: ${error.message}`);
                    loadFallbackSections();
                } else if (data && data.length > 0) {
                    setSections(data as Section[]);
                    if (asset && asset.section) {
                        setSelectedSection(asset.section);
                    } else {
                        setSelectedSection(data[0].section_name);
                    }
                } else {
                    loadFallbackSections();
                }
            } catch (err: any) {
                console.warn('Error fetching sections:', err);
                loadFallbackSections();
            }
        };

        const loadFallbackSections = () => {
            const stored = localStorage.getItem('cached_sections');
            let secs = MOCK_SECTIONS;
            if (stored) {
                secs = JSON.parse(stored);
            }
            setSections(secs);
            if (asset && asset.section) {
                setSelectedSection(asset.section);
            } else if (secs.length > 0) {
                setSelectedSection(secs[0].section_name);
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
                .from('machines')
                .update({ section: selectedSection })
                .eq('id', asset.id);

            if (error) {
                console.warn(`Supabase update error: ${error.message}`);
                updateFallbackAsset();
            } else {
                updateCachedAssetMemory();
                setAsset(prev => prev ? { ...prev, section: selectedSection } : null);
                toast.success("Section updated successfully!");
                setIsModalOpen(false);
            }
        } catch (err: any) {
            console.warn('Update location exception:', err);
            updateFallbackAsset();
        } finally {
            setSaving(false);
        }
    };

    const updateCachedAssetMemory = () => {
        const stored = localStorage.getItem('cached_assets');
        if (stored) {
            const all: Machine[] = JSON.parse(stored);
            const idx = all.findIndex(a => a.id === asset.id);
            if (idx !== -1) {
                all[idx].section = selectedSection;
                localStorage.setItem('cached_assets', JSON.stringify(all));
            }
        }
    };

    const updateFallbackAsset = () => {
        const stored = localStorage.getItem('cached_assets');
        let all: Machine[] = MOCK_MACHINES;
        if (stored) {
            all = JSON.parse(stored);
        }
        const idx = all.findIndex(a => a.id === asset.id);
        if (idx !== -1) {
            all[idx].section = selectedSection;
        } else {
            asset.section = selectedSection;
            all.push(asset);
        }
        localStorage.setItem('cached_assets', JSON.stringify(all));
        setAsset(prev => prev ? { ...prev, section: selectedSection } : null);
        toast.success("Section updated (Local Demo Mode)");
        setIsModalOpen(false);
    };

    if (loading) return <div className="p-4 md:p-8">Loading asset details...</div>;
    if (!asset) return <div className="p-4 md:p-8">Asset not found</div>;

    return (
        <div className="p-4 md:p-8 max-w-4xl relative">
            <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-text-primary">{asset.asset_name}</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="bg-bg-elevated p-6 rounded-xl border border-brand-border shadow-sm flex flex-col justify-between">
                    <div>
                        <h3 className="font-bold text-text-primary mb-3">Identifiers</h3>
                        <p className="text-text-secondary text-sm mb-1.5">S/N: <span className="text-text-primary font-mono">{asset.serial_number}</span></p>
                        <p className="text-text-secondary text-sm">QR Code: <span className="text-text-primary font-mono">{asset.qr_code}</span></p>
                    </div>
                </div>
                <div className="bg-bg-elevated p-6 rounded-xl border border-brand-border shadow-sm flex flex-col justify-between gap-4">
                    <div>
                        <h3 className="font-bold text-text-primary mb-3">Section Details</h3>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2 pb-2">
                            <p className="text-text-secondary text-sm">Section: <span className="text-text-primary font-medium">{asset.section}</span></p>
                            {!can_update_location ? (
                                <button 
                                    className="text-text-secondary/50 text-sm font-medium text-left cursor-not-allowed min-h-[32px] py-1 flex items-center gap-1.5" 
                                    title="Permission denied"
                                    disabled
                                >
                                    Change Section <span className="text-[10px] bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Blocked</span>
                                </button>
                            ) : (
                                <button onClick={() => setIsModalOpen(true)} className="text-brand-gold text-sm font-medium hover:underline text-left cursor-pointer min-h-[32px] py-1">Change Section</button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
                    <div className="bg-bg-elevated p-6 rounded-xl border border-brand-border w-full max-w-sm shadow-xl">
                        <h2 className="text-lg font-bold mb-4">Update Machine Section</h2>
                        <select 
                            value={selectedSection} 
                            onChange={(e) => setSelectedSection(e.target.value)}
                            className="w-full p-2.5 min-h-[44px] border border-brand-border rounded-lg mb-4 bg-bg-base text-text-primary outline-none focus:border-brand-gold text-sm cursor-pointer font-medium"
                        >
                            {sections.map(s => <option key={s.id} value={s.section_name}>{s.section_name}</option>)}
                        </select>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2.5 min-h-[44px] text-text-secondary hover:bg-bg-base rounded-lg cursor-pointer text-sm">Cancel</button>
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
                        console.warn(`Error querying ${table}:`, error.message);
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
                    loadFallbackCustomer();
                }
            } catch (err: any) {
                console.warn('Error loading customer details:', err);
                loadFallbackCustomer();
            } finally {
                setLoading(false);
            }
        };

        const loadFallbackCustomer = () => {
            const stored = localStorage.getItem('cached_customers');
            let custs = MOCK_CUSTOMERS;
            if (stored) {
                custs = JSON.parse(stored);
            } else {
                localStorage.setItem('cached_customers', JSON.stringify(MOCK_CUSTOMERS));
            }
            const found = custs.find(c => c['A/C Code'] === code);
            setCustomer(found || null);
        };

        fetchCustomer();
    }, [code]);

    if (loading) return <div className="p-4 md:p-8">Loading customer details...</div>;
    if (!customer) return <div className="p-4 md:p-8">Customer not found ({code})</div>;

    const customerName = customer['Customer Name'] || 'N/A';
    const acCode = customer['A/C Code'] || code || 'N/A';
    const telephone = customer['Telephone-1'] || 'N/A';
    const email = customer['Email-1'] || 'N/A';
    const shipTo = customer['Ship To'] || 'N/A';

    return (
        <div className="p-4 md:p-8 max-w-2xl animate-fade-in">
            <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-text-primary">{customerName}</h1>
            <div className="bg-bg-elevated p-6 md:p-8 rounded-xl border border-brand-border space-y-4 shadow-sm">
                <p className="text-text-secondary">A/C Code: <span className="text-text-primary font-medium font-mono">{acCode}</span></p>
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
        qrbox: { width: 220, height: 220 }
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

          let foundAssetId: string | null = null;
          try {
            const { data, error } = await supabase
              .from('machines')
              .select('id')
              .eq('qr_code', decodedText)
              .maybeSingle();

            if (!error && data) {
              foundAssetId = data.id;
            }
          } catch (e) {
            console.warn("Supabase QR find error:", e);
          }

          toast.dismiss(loadingToastId);

          if (foundAssetId) {
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
                navigate(`/assets/${foundAssetId}?action=update_section`);
              }
            }, 800);
          } else {
            // Check cache & mock
            const stored = localStorage.getItem('cached_assets');
            let all = MOCK_MACHINES;
            if (stored) {
              all = JSON.parse(stored);
            }
            const found = all.find(a => a.qr_code === decodedText);

            if (found) {
              toast.success("Asset found (Local Cache)!");
              try {
                if (html5QrCode.isScanning) {
                  await html5QrCode.stop();
                }
              } catch (stopErr) {
                console.warn("Could not stop camera gracefully before navigating:", stopErr);
              }
              setTimeout(() => {
                if (isMounted) {
                  navigate(`/assets/${found.id}?action=update_section`);
                }
              }, 800);
            } else {
              toast.error("Scanned QR Code does not match any registered assets.");
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
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary font-sans">QR Code Scanner</h1>
        <p className="text-text-secondary text-sm">Scan a physical machinery or equipment asset QR label to query its details.</p>
      </header>

      <div className="bg-bg-elevated p-4 md:p-6 rounded-xl border border-brand-border md:max-w-md md:mx-auto shadow-sm">
        {errorStatus ? (
          <div className="p-8 text-center text-red-500 font-medium">
            <p className="mb-2">⚠️ {errorStatus}</p>
            <p className="text-sm text-text-secondary">Please check your camera permissions and refresh the page.</p>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-lg w-full h-[60vh] md:h-96">
            {/* Viewfinder overlay */}
            <div className={`absolute inset-0 border-2 border-brand-gold/10 pointer-events-none rounded-lg z-10 flex items-center justify-center transition-opacity duration-300 ${isProcessing ? 'opacity-0' : 'opacity-100'}`}>
              <div className="w-[200px] h-[200px] sm:w-[240px] sm:h-[240px] border-2 border-dashed border-brand-gold relative flex items-center justify-center rounded-lg">
                <span className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-brand-gold -mt-0.5 -ml-0.5 rounded-tl"></span>
                <span className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-brand-gold -mt-0.5 -mr-0.5 rounded-tr"></span>
                <span className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-brand-gold -mb-0.5 -ml-0.5 rounded-bl"></span>
                <span className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-brand-gold -mb-0.5 -mr-0.5 rounded-br"></span>
                
                {/* Laser animation */}
                <div className="w-[180px] sm:w-[220px] h-0.5 bg-brand-gold absolute animate-bounce opacity-70"></div>
              </div>
            </div>

            {/* html5-qrcode element */}
            <div className={`transition-opacity duration-300 h-full w-full ${isProcessing ? 'opacity-0' : 'opacity-100'}`}>
              <div id="reader" className="overflow-hidden rounded-lg bg-black w-full h-full [&_video]:object-cover [&_video]:w-full [&_video]:h-full [&_video]:min-h-full"></div>
            </div>
            
            {isProcessing && (
              <div className="absolute inset-0 bg-bg-elevated/90 backdrop-blur-sm flex items-center justify-center z-20 rounded-lg">
                <div className="text-center p-4">
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
  const { user, role: currentUserRole, refreshProfile } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Administrative states
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }
    setUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Password updated successfully!");
        setNewPassword('');
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setUpdatingPassword(false);
    }
  };

  const fetchUsers = async () => {
    if (currentUserRole !== 'admin') return;
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('email', { ascending: true });
      if (error) {
        console.warn(`Error loading users from Supabase: ${error.message}. Using fallback.`);
        loadFallbackUsers();
      } else if (data && data.length > 0) {
        setUsersList(data);
        localStorage.setItem('cached_users', JSON.stringify(data));
      } else {
        loadFallbackUsers();
      }
    } catch (err: any) {
      console.warn("Error loading users:", err);
      loadFallbackUsers();
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadFallbackUsers = () => {
    const stored = localStorage.getItem('cached_users');
    if (stored) {
      setUsersList(JSON.parse(stored));
    } else {
      const defaultUsers = [
        { id: user?.id || 'demo-admin-id', email: user?.email || 'admin@demo.local', role: 'admin', can_update_location: true },
        { id: 'demo-user-id', email: 'user@demo.local', role: 'user', can_update_location: true },
        { id: 'user-2', email: 'technician@company.co.za', role: 'user', can_update_location: false },
        { id: 'user-3', email: 'operator@company.co.za', role: 'user', can_update_location: true }
      ];
      localStorage.setItem('cached_users', JSON.stringify(defaultUsers));
      setUsersList(defaultUsers);
    }
  };

  useEffect(() => {
    if (currentUserRole === 'admin') {
      fetchUsers();
    }
  }, [currentUserRole]);

  const togglePermission = async (userId: string, currentVal: boolean) => {
    const newVal = !currentVal;
    // Optimistic UI update
    setUsersList(prev => prev.map(u => u.id === userId ? { ...u, can_update_location: newVal } : u));
    
    // Save locally
    const stored = localStorage.getItem('cached_users');
    if (stored) {
      const all = JSON.parse(stored);
      localStorage.setItem('cached_users', JSON.stringify(all.map((u: any) => u.id === userId ? { ...u, can_update_location: newVal } : u)));
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({ can_update_location: newVal })
        .eq('id', userId);
      
      if (error) {
        console.warn(`Supabase permissions update fail: ${error.message}. Saved locally.`);
      } else {
        toast.success(`Permission updated in database!`);
      }
      
      if (userId === user?.id) {
        refreshProfile();
      }
    } catch (err: any) {
      console.warn("Supabase permissions unexpected err, saved locally.");
      if (userId === user?.id) {
        refreshProfile();
      }
    }
  };

  const makeMeAdmin = async () => {
    if (!user) return;
    const loadingId = toast.loading("Elevating user role in database...");
    
    // Optimistically update locally
    localStorage.setItem('demo_user_role', 'admin');
    const stored = localStorage.getItem('cached_users');
    if (stored) {
      const all = JSON.parse(stored);
      localStorage.setItem('cached_users', JSON.stringify(all.map((u: any) => u.id === user.id ? { ...u, role: 'admin' } : u)));
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({ role: 'admin' })
        .eq('id', user.id);

      toast.dismiss(loadingId);
      if (error) {
        console.warn(`Database error during self elevation: ${error.message}. Role elevated locally.`);
      }
      toast.success("You are now an Administrator! Reloading profile...");
      refreshProfile();
    } catch (err: any) {
      toast.dismiss(loadingId);
      toast.success("You are now an Administrator! Reloading profile...");
      refreshProfile();
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 animate-fade-in">
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">Settings</h1>
          <p className="text-text-secondary text-sm">Manage your profile, security, and access controls.</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs text-text-secondary font-mono px-3 py-1.5 rounded-lg bg-bg-elevated border border-brand-border">
            Role: <span className="text-brand-gold font-bold uppercase">{currentUserRole || 'Loading...'}</span>
          </span>
          {currentUserRole !== 'admin' && (
            <button 
              onClick={makeMeAdmin}
              className="text-xs bg-brand-gold/10 hover:bg-brand-gold/20 text-brand-gold px-3 py-1.5 rounded-lg border border-brand-gold/20 cursor-pointer font-medium transition-colors"
            >
              🛠️ Elevate to Admin
            </button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Password Settings */}
        <div className="lg:col-span-1 space-y-6">
          <section className="bg-bg-elevated p-6 rounded-xl border border-brand-border shadow-sm font-sans">
            <h2 className="text-lg font-bold text-text-primary mb-4 pb-2 border-b border-brand-border/40">Security</h2>
            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Change Password</label>
                <input 
                  type="password" 
                  minLength={6}
                  placeholder="New Password (min 6 chars)" 
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)} 
                  className="w-full p-2.5 border border-brand-border rounded-lg bg-bg-base text-text-primary placeholder:text-text-secondary outline-none focus:border-brand-gold text-sm" 
                  required 
                />
              </div>
              <button 
                type="submit" 
                disabled={updatingPassword} 
                className="w-full bg-brand-gold hover:bg-brand-gold/90 text-white p-2.5 min-h-[44px] rounded-lg font-medium text-sm transition-colors flex items-center justify-center cursor-pointer"
              >
                {updatingPassword ? "Updating..." : "Update Password"}
              </button>
            </form>
          </section>

          <section className="bg-bg-elevated p-6 rounded-xl border border-brand-border shadow-sm">
            <h2 className="text-base font-bold text-text-primary mb-2">Account Info</h2>
            <p className="text-xs text-text-secondary">Email: <span className="text-text-primary font-mono">{user?.email}</span></p>
            <p className="text-xs text-text-secondary mt-1">User ID: <span className="text-text-primary font-mono text-[10px] break-all">{user?.id}</span></p>
          </section>
        </div>

        {/* Right Column - Admin / Permissions Section */}
        <div className="lg:col-span-2">
          {currentUserRole === 'admin' ? (
            <section className="bg-bg-elevated p-6 rounded-xl border border-brand-border shadow-sm h-full">
              <div className="mb-4 pb-2 border-b border-brand-border/40 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-text-primary">Permissions Management</h2>
                  <p className="text-xs text-text-secondary">Set application access rights for your team.</p>
                </div>
                <button 
                  onClick={fetchUsers}
                  className="text-xs text-brand-gold font-semibold hover:underline min-h-[32px] px-2"
                >
                  Refresh Rows
                </button>
              </div>

              {loadingUsers && usersList.length === 0 ? (
                <div className="py-12 text-center text-text-secondary">
                  <div className="w-6 h-6 border-2 border-brand-gold border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  Loading user list...
                </div>
              ) : usersList.length === 0 ? (
                <div className="py-12 text-center text-text-secondary text-sm">
                  No other user records found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-brand-border text-text-secondary text-xs font-bold uppercase">
                        <th className="pb-3">User Email</th>
                        <th className="pb-3">Role</th>
                        <th className="pb-3 text-right">Location Updates</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/40">
                      {usersList.map((usr) => (
                        <tr key={usr.id} className="hover:bg-bg-base/20 transition-colors">
                          <td className="py-3 text-sm text-text-primary font-medium pr-2">
                            <div className="max-w-[160px] sm:max-w-none truncate" title={usr.email}>
                              {usr.email || 'N/A'}
                            </div>
                          </td>
                          <td className="py-3 text-xs">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              usr.role === 'admin' ? 'bg-brand-gold/10 text-brand-gold' : 'bg-text-secondary/10 text-text-secondary'
                            }`}>
                              {usr.role || 'user'}
                            </span>
                          </td>
                          <td className="py-3 text-right text-sm">
                            <div className="flex items-center justify-end gap-2">
                              <span className={`text-[11px] font-medium ${
                                usr.can_update_location !== false ? 'text-emerald-500' : 'text-red-500'
                              }`}>
                                {usr.can_update_location !== false ? 'Allowed' : 'Disallowed'}
                              </span>
                              
                              {/* Toggle switch */}
                              <button
                                onClick={() => togglePermission(usr.id, usr.can_update_location !== false)}
                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                  usr.can_update_location !== false ? 'bg-emerald-500' : 'bg-brand-border'
                                }`}
                                aria-label="Toggle Section Update Permission"
                              >
                                <span
                                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                    usr.can_update_location !== false ? 'translate-x-5' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ) : (
            <div className="bg-bg-elevated/40 border border-brand-border border-dashed p-8 rounded-xl text-center flex flex-col items-center justify-center h-full">
              <span className="text-3xl mb-3 opacity-60">🔒</span>
              <h3 className="text-base font-bold text-text-primary mb-1">Administrative Controls</h3>
              <p className="text-xs text-text-secondary max-w-sm">
                Only server administrators are authorized to configure team permissions and feature accesses. Elevate yourself using the helper button above to test.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, loginDemo } = useAuth();
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
    <div className="flex items-center justify-center min-h-screen h-screen bg-bg-base p-4 animate-fade-in">
      <form onSubmit={handleLogin} className="bg-bg-elevated p-6 sm:p-8 rounded-xl border border-brand-border w-full max-w-sm shadow-md gap-4 flex flex-col">
        <h1 className="text-2xl font-bold text-text-primary text-center">Sign In</h1>
        <div className="space-y-4">
          <input 
            type="email" 
            placeholder="Email" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            className="w-full p-3 h-11 min-h-[44px] border border-brand-border rounded-lg bg-bg-base text-text-primary placeholder:text-text-secondary outline-none focus:border-brand-gold text-sm" 
            required 
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            className="w-full p-3 h-11 min-h-[44px] border border-brand-border rounded-lg bg-bg-base text-text-primary placeholder:text-text-secondary outline-none focus:border-brand-gold text-sm" 
            required 
          />
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-brand-gold text-white p-3 h-11 min-h-[44px] rounded-lg hover:bg-brand-gold/90 transition-colors font-medium flex items-center justify-center cursor-pointer text-sm"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-brand-border/60"></div>
            <span className="flex-shrink mx-4 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Demo / Testing Bypass</span>
            <div className="flex-grow border-t border-brand-border/60"></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                loginDemo('admin');
                toast.success('Bypassed as Administrator demo!');
                navigate('/');
              }}
              className="bg-brand-gold/10 hover:bg-brand-gold/20 text-brand-gold border border-brand-gold/30 p-2.5 rounded-lg font-semibold text-xs transition-colors cursor-pointer text-center min-h-[40px] flex items-center justify-center"
            >
              🛠️ Demo Admin
            </button>
            <button
              type="button"
              onClick={() => {
                loginDemo('user');
                toast.success('Bypassed as Staff User demo!');
                navigate('/');
              }}
              className="bg-text-secondary/10 hover:bg-text-secondary/25 text-text-secondary border border-brand-border/60 p-2.5 rounded-lg font-semibold text-xs transition-colors cursor-pointer text-center min-h-[40px] flex items-center justify-center"
            >
              👤 Demo Staff
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}


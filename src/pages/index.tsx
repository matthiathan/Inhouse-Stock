import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Asset, Customer } from '../types';

export function StockPage() {
  return (
    <div className="p-8">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Stock Inventory</h1>
          <p className="text-text-secondary">Manage and track your stock levels across departments.</p>
        </div>
        <button className="bg-brand-gold text-white px-5 py-2 rounded-lg font-medium hover:bg-brand-gold/90 transition-colors">
          Receive Stock
        </button>
      </header>
      <div className="bg-bg-elevated p-12 rounded-xl border border-brand-border text-center text-text-secondary">
        Inventory Data Table Placeholder
      </div>
    </div>
  );
}

export function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/assets')
      .then(res => res.json())
      .then(data => { setAssets(data); setLoading(false); });
  }, []);

  if (loading) return <div className="p-8">Loading assets...</div>;

  return (
    <div className="p-8">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Assets</h1>
          <p className="text-text-secondary">List and manage your enterprise equipment and machinery.</p>
        </div>
      </header>
      <div className="bg-bg-elevated rounded-xl border border-brand-border overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-brand-border text-text-secondary text-sm">
              <th className="p-4">S/N</th>
              <th className="p-4">QR</th>
              <th className="p-4">Machine Name</th>
              <th className="p-4">Location</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => (
              <tr key={asset.id} className="border-b border-brand-border hover:bg-bg-base cursor-pointer" onClick={() => navigate(`/assets/${asset.id}`)}>
                <td className="p-4">{asset['Serial#']}</td>
                <td className="p-4">{asset['QR Code']}</td>
                <td className="p-4 font-medium text-text-primary">{asset['Asset Name']}</td>
                <td className="p-4">{asset['Current Location']}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AssetDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
      fetch(`/api/assets/${id}`)
      .then(res => res.json())
      .then(data => { setAsset(data); setLoading(false); });
  }, [id]);

  if (loading) return <div className="p-8">Loading asset details...</div>;
  if (!asset) return <div className="p-8">Asset not found</div>;

  return (
      <div className="p-8 max-w-4xl">
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
                  <p className="text-text-secondary text-sm mb-3">Customer: <span className="text-text-primary">{asset['Current Customer Name']}</span></p>
                  <Link to={`/customers/${asset['C.Code']}`} className="text-brand-gold text-sm font-medium hover:underline">View Customer Details</Link>
              </div>
          </div>
      </div>
  );
}

export function CustomerDetailsPage() {
    const { code } = useParams<{ code: string }>();
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/customers/${code}`)
        .then(res => res.json())
        .then(data => { setCustomer(data); setLoading(false); });
    }, [code]);

    if (loading) return <div className="p-8">Loading customer details...</div>;
    if (!customer) return <div className="p-8">Customer not found ({code})</div>;

    return (
        <div className="p-8 max-w-2xl">
            <h1 className="text-3xl font-bold mb-6 text-text-primary">{customer['Customer Name']}</h1>
            <div className="bg-bg-elevated p-8 rounded-xl border border-brand-border space-y-4">
                <p className="text-text-secondary">A/C Code: <span className="text-text-primary font-medium">{customer['A/C Code']}</span></p>
                <p className="text-text-secondary">Telephone: <span className="text-text-primary font-medium">{customer['Telephone-1']}</span></p>
                <p className="text-text-secondary">Email: <span className="text-text-primary font-medium">{customer['Email-1']}</span></p>
                <p className="text-text-secondary">Ship To: <span className="text-text-primary font-medium">{customer['Ship To']}</span></p>
            </div>
        </div>
    );
}

export function ScannerPage() {
  return (
    <div className="flex items-center justify-center h-full min-h-[500px] p-8">
      <div className="bg-bg-elevated p-12 rounded-xl border border-brand-border text-center w-full max-w-md shadow-sm">
        <h2 className="text-xl font-bold text-text-primary mb-2">Camera Integration</h2>
        <p className="text-text-secondary mb-8">Ready to scan codes.</p>
        <button className="bg-brand-gold text-white px-6 py-3 rounded-lg font-medium hover:bg-brand-gold/90 transition-colors w-full">
          Tap to Scan QR Code
        </button>
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
export function LoginPage() { return <div className="flex items-center justify-center p-10 font-bold text-2xl">Login Page</div> }

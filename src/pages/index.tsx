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
  return (
    <div className="p-8">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Assets</h1>
          <p className="text-text-secondary">List and manage your enterprise equipment and machinery.</p>
        </div>
        <button className="bg-brand-gold text-white px-5 py-2 rounded-lg font-medium hover:bg-brand-gold/90 transition-colors">
          Add Asset
        </button>
      </header>
      <div className="bg-bg-elevated rounded-xl border border-brand-border divide-y divide-brand-border">
        {['Asset 1', 'Asset 2', 'Asset 3'].map((asset) => (
          <div key={asset} className="p-4 text-text-primary">{asset}</div>
        ))}
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

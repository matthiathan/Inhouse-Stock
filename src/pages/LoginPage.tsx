import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { DatabaseZap, LockKeyhole, ShieldCheck, UserRoundCheck } from 'lucide-react';
import { isConfigured, supabase } from '../lib/supabase';
// @ts-ignore
import DallmayrLogoLight from '../../assets/icon-512-light.png';
// @ts-ignore
import DallmayrLogoDark from '../../assets/icon-512-dark.png';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const demoRoles = [
    { label: 'Operations', role: 'ops_manager' },
    { label: 'Warehouse', role: 'warehouse' },
    { label: 'Technician', role: 'road_tech' },
    { label: 'Admin', role: 'admin' },
  ];

  const startDemo = (role: string) => {
    localStorage.setItem('demo_user_role', role);
    localStorage.setItem('demo_user_email', `${role.replace('_', '.')}@dallmayr.co.za`);
    window.location.href = '/';
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConfigured) {
      startDemo('admin');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
    } else {
      navigate('/');
    }
    setLoading(false);
  };

  return (
    <div className="grid min-h-screen bg-bg-base text-text-primary lg:grid-cols-[minmax(0,1fr)_460px]">
      <section className="relative hidden overflow-hidden bg-dallmayr-blue lg:block">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(6,27,48,0.94),rgba(16,24,40,0.78))]" />
        <img
          src={DallmayrLogoDark}
          alt=""
          aria-hidden="true"
          className="absolute right-[-9rem] top-1/2 h-[680px] -translate-y-1/2 opacity-15"
        />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <img src={DallmayrLogoLight} alt="Dallmayr South Africa" className="h-20 w-fit rounded-md bg-white/95 p-2 shadow-elevated" />
          <div className="max-w-xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold uppercase tracking-widest text-dallmayr-gold-light">
              <ShieldCheck size={16} />
              Dallmayr SA
            </div>
            <h1 className="text-5xl font-black leading-tight">Operations Portal</h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-white/76">
              Inventory, dispatch, service, analytics, and asset control in one secured workspace.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            {['Stock Control', 'Field Service', 'Route Ops'].map(item => (
              <div key={item} className="rounded-md border border-white/10 bg-white/10 p-3 text-white/80 backdrop-blur">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-8 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex justify-center lg:hidden">
            <img src={DallmayrLogoLight} alt="Dallmayr South Africa" className="h-18 w-auto" />
          </div>

          <div className="enterprise-panel rounded-lg p-6 sm:p-7">
            <div className="mb-7">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-dallmayr-blue text-dallmayr-gold-light">
                <LockKeyhole size={21} strokeWidth={2.4} />
              </div>
              <h2 className="text-2xl font-bold">Sign in</h2>
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                Use your approved Dallmayr SA account to open the workspace.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-text-secondary">Email</span>
                <input
                  type="email"
                  placeholder="name@dallmayr.co.za"
                  className="h-11 w-full rounded-md border border-brand-border bg-bg-elevated px-3 text-sm text-text-primary shadow-subtle transition focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required={isConfigured}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-text-secondary">Password</span>
                <input
                  type="password"
                  placeholder="Secure password"
                  className="h-11 w-full rounded-md border border-brand-border bg-bg-elevated px-3 text-sm text-text-primary shadow-subtle transition focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required={isConfigured}
                />
              </label>
              <button
                type="submit"
                className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-dallmayr-blue px-4 text-sm font-bold text-white shadow-subtle transition hover:bg-dallmayr-blue-light disabled:cursor-wait disabled:opacity-70"
                disabled={loading}
              >
                <UserRoundCheck size={18} />
                {loading ? 'Signing in...' : isConfigured ? 'Open Portal' : 'Open Demo Portal'}
              </button>
            </form>

            {!isConfigured && (
              <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4 dark:border-amber-400/20 dark:bg-amber-400/10">
                <div className="mb-3 flex items-center gap-2 text-sm font-bold text-amber-900 dark:text-amber-200">
                  <DatabaseZap size={17} />
                  Local demo mode
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {demoRoles.map(item => (
                    <button
                      key={item.role}
                      type="button"
                      onClick={() => startDemo(item.role)}
                      className="rounded-md border border-amber-200 bg-white px-3 py-2 text-xs font-bold text-amber-950 transition hover:border-brand-gold hover:bg-amber-100 dark:border-amber-400/20 dark:bg-bg-elevated dark:text-amber-100"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

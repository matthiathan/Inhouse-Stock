import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './hooks/useAuth.tsx';

const queryClient = new QueryClient();

// Catch and swallow harmless play() request interruption errors caused by media element unmounting
if (typeof HTMLVideoElement !== 'undefined' && HTMLVideoElement.prototype.play) {
  const originalPlay = HTMLVideoElement.prototype.play;
  HTMLVideoElement.prototype.play = function (...args) {
    return originalPlay.apply(this, args).catch((err: any) => {
      const msg = String(err?.message || err);
      const name = String(err?.name || '');
      if (
        name === 'AbortError' ||
        msg.includes('play()') ||
        msg.includes('interrupted') ||
        msg.includes('media was removed')
      ) {
        console.warn('Swallowed play interruption:', err);
        return;
      }
      throw err;
    });
  };
}

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  if (reason) {
    const msg = String(reason.message || reason);
    if (msg.includes('play()') || msg.includes('interrupted') || msg.includes('media was removed')) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }
});

window.addEventListener('error', (event) => {
  const msg = String(event.message || event.error);
  if (msg.includes('play()') || msg.includes('interrupted') || msg.includes('media was removed')) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
});

async function bootstrap() {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
}

bootstrap();


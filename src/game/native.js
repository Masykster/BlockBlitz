import { App } from '@capacitor/app';
import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';

let backConfirmTimeout = null;
let lastBackPressAt = 0;

function showExitToast(toastEl) {
  if (!toastEl) return;
  toastEl.classList.remove('opacity-0', 'translate-y-2');
  toastEl.classList.add('opacity-100', 'translate-y-0');

  if (backConfirmTimeout) {
    clearTimeout(backConfirmTimeout);
  }
  backConfirmTimeout = setTimeout(() => {
    toastEl.classList.add('opacity-0', 'translate-y-2');
    toastEl.classList.remove('opacity-100', 'translate-y-0');
  }, 1900);
}

/**
 * Configure Capacitor native bars, splash screen, lifecycle auto-save, and back button handling.
 */
export async function setupNativeBridge({
  exitToastEl,
  onSaveState,
  onSuspendAudio,
  onResumeAudio,
}) {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      onSaveState?.();
      onSuspendAudio?.();
    } else {
      onResumeAudio?.();
    }
  });

  window.addEventListener('pagehide', () => {
    onSaveState?.();
  });

  if (!Capacitor.isNativePlatform()) {
    return;
  }

  // Configure dark status bar / system bar content (light icons on dark background)
  try {
    await SystemBars.setStyle({ style: SystemBarsStyle.Dark });
  } catch {
    // Fallback for older Android WebView / Capacitor runtime
  }

  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#111633' });
  } catch {
    // Ignored on Android 15+ where edge-to-edge overrides status bar background color
  }

  App.addListener('appStateChange', ({ isActive }) => {
    if (!isActive) {
      onSaveState?.();
      onSuspendAudio?.();
    } else {
      onResumeAudio?.();
    }
  }).catch(() => {});

  App.addListener('backButton', () => {
    onSaveState?.();
    const now = Date.now();
    if (now - lastBackPressAt < 2000) {
      App.exitApp().catch(() => {});
      return;
    }
    lastBackPressAt = now;
    showExitToast(exitToastEl);
  }).catch(() => {});

  // Hide native splash once the UI has rendered cleanly
  requestAnimationFrame(() => {
    SplashScreen.hide({ fadeOutDuration: 250 }).catch(() => {});
  });
}

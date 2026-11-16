import { App } from '@capacitor/app';
import { Capacitor, SystemBarType, SystemBars, SystemBarsStyle } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';

let backConfirmTimeout = null;
let lastBackPressAt = 0;

export function showExitToast(toastEl) {
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

async function applyHiddenStatusBar() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await SystemBars.setStyle({ style: SystemBarsStyle.Dark });
    await SystemBars.hide({ bar: SystemBarType.StatusBar });
  } catch {
    // Ignore on older runtimes
  }

  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.hide();
  } catch {
    // Ignore if unavailable
  }
}

/**
 * Configure Capacitor native bars, splash screen, lifecycle auto-save, and back button routing.
 */
export async function setupNativeBridge({
  exitToastEl,
  onSaveState,
  onSuspendAudio,
  onResumeAudio,
  onPauseIfNeeded,
  onBackPressed,
}) {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      onPauseIfNeeded?.();
      onSaveState?.();
      onSuspendAudio?.();
    } else {
      onResumeAudio?.();
    }
  });

  window.addEventListener('pagehide', () => {
    onPauseIfNeeded?.();
    onSaveState?.();
  });

  if (!Capacitor.isNativePlatform()) {
    return;
  }

  await applyHiddenStatusBar();

  App.addListener('appStateChange', ({ isActive }) => {
    if (!isActive) {
      onPauseIfNeeded?.();
      onSaveState?.();
      onSuspendAudio?.();
    } else {
      applyHiddenStatusBar();
      onResumeAudio?.();
    }
  }).catch(() => {});

  App.addListener('backButton', () => {
    onSaveState?.();
    const handled = onBackPressed ? onBackPressed() : false;
    if (handled) {
      return;
    }

    const now = Date.now();
    if (now - lastBackPressAt < 2000) {
      App.exitApp().catch(() => {});
      return;
    }
    lastBackPressAt = now;
    showExitToast(exitToastEl);
  }).catch(() => {});

  requestAnimationFrame(() => {
    SplashScreen.hide({ fadeOutDuration: 220 }).catch(() => {});
  });
}

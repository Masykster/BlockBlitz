import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

function isNative() {
  return Capacitor.isNativePlatform();
}

export const haptics = {
  pickup() {
    if (!isNative()) return;
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
  },

  place() {
    if (!isNative()) return;
    Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
  },

  clear(linesCount = 1) {
    if (!isNative()) return;
    if (linesCount >= 2) {
      Haptics.notification({ type: NotificationType.Success }).catch(() => {});
    } else {
      Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
    }
  },

  allClear() {
    if (!isNative()) return;
    Haptics.notification({ type: NotificationType.Success }).catch(() => {});
  },

  invalid() {
    if (!isNative()) return;
    Haptics.notification({ type: NotificationType.Warning }).catch(() => {});
  },

  gameOver() {
    if (!isNative()) return;
    Haptics.notification({ type: NotificationType.Error }).catch(() => {});
  },
};

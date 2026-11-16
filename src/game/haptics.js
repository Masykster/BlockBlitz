import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

let hapticsEnabled = true;

function canVibrate() {
  return hapticsEnabled && Capacitor.isNativePlatform();
}

export const haptics = {
  setEnabled(enabled) {
    hapticsEnabled = Boolean(enabled);
  },

  pickup() {
    if (!canVibrate()) return;
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
  },

  place() {
    if (!canVibrate()) return;
    Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
  },

  clear(linesCount = 1) {
    if (!canVibrate()) return;
    if (linesCount >= 2) {
      Haptics.notification({ type: NotificationType.Success }).catch(() => {});
    } else {
      Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
    }
  },

  hammer() {
    if (!canVibrate()) return;
    Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
  },

  levelWin() {
    if (!canVibrate()) return;
    Haptics.notification({ type: NotificationType.Success }).catch(() => {});
  },

  allClear() {
    if (!canVibrate()) return;
    Haptics.notification({ type: NotificationType.Success }).catch(() => {});
  },

  invalid() {
    if (!canVibrate()) return;
    Haptics.notification({ type: NotificationType.Warning }).catch(() => {});
  },

  gameOver() {
    if (!canVibrate()) return;
    Haptics.notification({ type: NotificationType.Error }).catch(() => {});
  },
};

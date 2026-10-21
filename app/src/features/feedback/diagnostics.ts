import * as Application from 'expo-application';
import * as Device from 'expo-device';

import { textScaleOptions, type AppearanceSettings } from '@/features/appearance/settings';
import { colorThemeLabels } from '@/theme/colors';

/**
 * Facts about the app and device that help with a problem report. Only these are ever sent, and
 * only when the user leaves "Include device details" on. Never add planner, location or clothing data.
 */
export type DeviceDetails = {
  appVersion: string | null;
  buildNumber: string | null;
  osName: string | null;
  osVersion: string | null;
  deviceModel: string | null;
  textScale: number;
  colorTheme: AppearanceSettings['colorTheme'];
};

export type DiagnosticLine = { label: string; value: string };

const unknown = 'Unknown';

/** The lines shown in the preview and added to the email, in the order they appear. */
export function diagnosticLines(details: DeviceDetails): DiagnosticLine[] {
  const version = details.appVersion
    ? details.buildNumber
      ? `${details.appVersion} (${details.buildNumber})`
      : details.appVersion
    : unknown;
  const os = [details.osName, details.osVersion].filter(Boolean).join(' ') || unknown;
  const textSize =
    textScaleOptions.find((o) => o.value === details.textScale)?.label ?? `${details.textScale}x`;
  return [
    { label: 'App version', value: version },
    { label: 'System', value: os },
    { label: 'Device', value: details.deviceModel || unknown },
    { label: 'Text size', value: textSize },
    { label: 'Colors', value: colorThemeLabels[details.colorTheme] },
  ];
}

/** Reads the details from the running app and the given appearance settings. */
export function readDeviceDetails(appearance: AppearanceSettings): DeviceDetails {
  return {
    appVersion: Application.nativeApplicationVersion,
    buildNumber: Application.nativeBuildVersion,
    osName: Device.osName,
    osVersion: Device.osVersion,
    deviceModel: Device.modelName,
    textScale: appearance.textScale,
    colorTheme: appearance.colorTheme,
  };
}

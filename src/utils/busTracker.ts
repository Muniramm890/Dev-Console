// @ts-nocheck
// JS side of the native 24x7 bus-tracking service (Android only; see android/.../TrackerService.java).
import { registerPlugin } from "@capacitor/core";
import { isNative } from "../native";

export type TrackerStatus = {
  fineLocation: boolean; backgroundLocation: boolean; notifications: boolean; batteryUnrestricted: boolean; gpsOn: boolean;
  running: boolean; configured: boolean; userId: string; queued: number; lastSentAt: number; lastFixAt: number; lastError: string;
};

export const BusTracker = isNative ? registerPlugin("BusTracker") : null;

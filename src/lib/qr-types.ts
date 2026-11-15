import type { QRDesign } from './qr-design';
import type { QRContent } from './qr-content';

export interface QRCodeRecord {
  id: string;
  user_id: string;
  short_code: string;
  destination_url: string;
  title: string | null;
  qr_type: string;
  design: QRDesign | null;
  content?: QRContent | null;
  tracking_enabled: boolean;
  is_active: boolean;
  total_scans: number;
  created_at: string;
  updated_at: string;
  folder_id?: string | null;
  watched?: boolean;
  label_ids?: string[];
}

export interface ScanRecord {
  id: string;
  scanned_at: string;
  device_type: string | null;
  os: string | null;
  browser: string | null;
  country: string | null;
  city: string | null;
}

export interface QRAnalytics {
  totalScans: number;
  uniqueCountries: string[];
  deviceBreakdown: Record<string, number>;
  osBreakdown: Record<string, number>;
  browserBreakdown: Record<string, number>;
  countryBreakdown: Record<string, number>;
  scansByDay: Record<string, number>;
  recentScans: ScanRecord[];
}

export interface QRAnalyticsResponse {
  qrCode: QRCodeRecord;
  scans: ScanRecord[];
  analytics: QRAnalytics;
}

export interface QRDestinationChange {
  id: string;
  previous_url: string;
  new_url: string;
  changed_at: string;
}

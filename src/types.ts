/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type OperatorType = 'mci' | 'irancell' | 'rightel' | 'wifi';

export interface OperatorProfile {
  id: OperatorType;
  name: string;
  englishName: string;
  color: string;
  bgColor: string;
  borderColor: string;
  defaultCidrs: string[];
}

export type NetworkProvider = 'cloudflare' | 'google' | 'akamai' | 'custom';

export interface IpRangeGroup {
  id: NetworkProvider;
  name: string;
  persianName: string;
  ranges: string[];
}

export type ScanStatus = 'idle' | 'scanning' | 'paused' | 'completed';

export interface ScanResult {
  ip: string;
  provider: NetworkProvider;
  latency: number; // in ms
  lossRate: number; // 0 to 100%
  status: 'healthy' | 'unstable' | 'blocked';
  jitter: number; // in ms
  lastChecked: number; // timestamp
  operator?: OperatorType;
}

export type V2rayProtocol = 'vless' | 'vmess' | 'trojan' | 'shadowsocks';

export interface V2rayTemplate {
  id: string;
  name: string;
  protocol: V2rayProtocol;
  uuid: string;
  port: number;
  sni: string;
  host: string;
  path: string;
  type: 'ws' | 'grpc' | 'tcp';
  security: 'tls' | 'reality' | 'none';
  remark: string;
}

export interface SavedIp {
  id: string;
  ip: string;
  operator: OperatorType;
  provider: NetworkProvider;
  latency: number;
  addedAt: number;
  note?: string;
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { OperatorProfile, IpRangeGroup } from '../types';

export const OPERATORS: OperatorProfile[] = [
  {
    id: 'mci',
    name: 'همراه اول (MCI)',
    englishName: 'Hamrah-e Aval',
    color: 'rgb(6, 182, 212)', // Cyan
    bgColor: 'rgba(6, 182, 212, 0.1)',
    borderColor: 'rgba(6, 182, 212, 0.3)',
    defaultCidrs: [
      '172.64.0.0/16',
      '104.16.0.0/16',
      '162.158.0.0/16',
      '188.114.96.0/20'
    ]
  },
  {
    id: 'irancell',
    name: 'ایرانسل (MTN)',
    englishName: 'Irancell',
    color: 'rgb(234, 179, 8)', // Yellow
    bgColor: 'rgba(234, 179, 8, 0.1)',
    borderColor: 'rgba(234, 179, 8, 0.3)',
    defaultCidrs: [
      '172.67.0.0/16',
      '104.18.0.0/16',
      '104.21.0.0/16',
      '108.162.192.0/18'
    ]
  },
  {
    id: 'rightel',
    name: 'رایتل (RighTel)',
    englishName: 'RighTel',
    color: 'rgb(236, 72, 153)', // Magenta
    bgColor: 'rgba(236, 72, 153, 0.1)',
    borderColor: 'rgba(236, 72, 153, 0.3)',
    defaultCidrs: [
      '172.64.100.0/24',
      '104.16.50.0/24',
      '162.158.40.0/24',
      '141.101.90.0/24'
    ]
  },
  {
    id: 'wifi',
    name: 'اینترنت ثابت (ADSL/VDSL/FTTH)',
    englishName: 'Fixed Internet',
    color: 'rgb(139, 92, 246)', // Violet
    bgColor: 'rgba(139, 92, 246, 0.1)',
    borderColor: 'rgba(139, 92, 246, 0.3)',
    defaultCidrs: [
      '104.16.0.0/15',
      '172.64.0.0/15',
      '108.162.192.0/18',
      '162.158.0.0/15',
      '188.114.96.0/20'
    ]
  }
];

export const NETWORK_PRESETS: IpRangeGroup[] = [
  {
    id: 'cloudflare',
    name: 'Cloudflare CDN',
    persianName: 'کلودفلر (بزرگترین CDN)',
    ranges: [
      '172.64.0.0/16',
      '104.16.0.0/16',
      '104.24.0.0/16',
      '162.158.0.0/16',
      '108.162.192.0/18',
      '141.101.64.0/18',
      '188.114.96.0/20',
      '190.93.240.0/20',
      '197.234.240.0/22',
      '198.41.128.0/17'
    ]
  },
  {
    id: 'google',
    name: 'Google Infrastructure',
    persianName: 'زیرساخت گوگل',
    ranges: [
      '172.217.0.0/16',
      '142.250.0.0/15',
      '216.58.192.0/19',
      '173.194.0.0/16',
      '74.125.0.0/16',
      '64.233.160.0/19'
    ]
  },
  {
    id: 'akamai',
    name: 'Akamai Technology',
    persianName: 'آکامی (توزیع محتوا)',
    ranges: [
      '23.0.0.0/12',
      '104.64.0.0/10',
      '23.190.0.0/15',
      '184.24.0.0/13',
      '104.116.0.0/15',
      '23.212.0.0/16'
    ]
  },
  {
    id: 'custom',
    name: 'Custom Ranges',
    persianName: 'رنج‌های سفارشی شما',
    ranges: []
  }
];

// Helper to expand a CIDR prefix (e.g. "172.64.0.0/29") into specific IP addresses
export function expandCidr(cidr: string, limitCount: number = 20): string[] {
  try {
    const parts = cidr.trim().split('/');
    if (parts.length !== 2) {
      // Check if it's a standalone IP
      if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(cidr.trim())) {
        return [cidr.trim()];
      }
      return [];
    }
    
    const ip = parts[0];
    const mask = parseInt(parts[1], 10);
    if (isNaN(mask) || mask < 0 || mask > 32) return [];

    const ipParts = ip.split('.').map(Number);
    if (ipParts.some(isNaN) || ipParts.some(p => p < 0 || p > 255)) return [];

    const ipNum = (ipParts[0] << 24) + (ipParts[1] << 16) + (ipParts[2] << 8) + ipParts[3];
    const hostCount = Math.pow(2, 32 - mask);
    
    const results: string[] = [];
    const count = Math.min(hostCount, limitCount);
    
    // Distribute sampling randomly inside the subnet for better discovery rate under censorship!
    // Instead of sequentially testing 172.64.0.0, 172.64.0.1, we sample across the subnet.
    const step = Math.max(1, Math.floor(hostCount / count));

    for (let i = 0; i < count; i++) {
      const offset = Math.floor(i * step + Math.random() * Math.min(step, 5));
      const currentIpNum = (ipNum + offset) >>> 0;
      
      const p1 = (currentIpNum >>> 24) & 255;
      const p2 = (currentIpNum >>> 16) & 255;
      const p3 = (currentIpNum >>> 8) & 255;
      const p4 = currentIpNum & 255;
      
      const currentIpStr = `${p1}.${p2}.${p3}.${p4}`;
      results.push(currentIpStr);
    }
    
    return results;
  } catch (error) {
    console.error('Failed to parse CIDR', cidr, error);
    return [];
  }
}

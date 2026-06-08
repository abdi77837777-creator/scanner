/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { V2rayTemplate, V2rayProtocol, SavedIp, OperatorType } from '../types';

/**
 * Generates VLESS URI
 */
export function buildVlessUri(ip: string, template: V2rayTemplate, operatorName: string): string {
  const remark = encodeURIComponent(`${template.remark} | ${operatorName} - LekScanner`);
  const queryParts: string[] = [];
  
  if (template.type) queryParts.push(`type=${template.type}`);
  if (template.security) queryParts.push(`security=${template.security}`);
  if (template.sni) queryParts.push(`sni=${template.sni}`);
  if (template.host) queryParts.push(`host=${template.host}`);
  if (template.path) queryParts.push(`path=${encodeURIComponent(template.path)}`);
  
  const queryStr = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
  return `vless://${template.uuid}@${ip}:${template.port}${queryStr}#${remark}`;
}

/**
 * Generates Trojan URI
 */
export function buildTrojanUri(ip: string, template: V2rayTemplate, operatorName: string): string {
  const remark = encodeURIComponent(`${template.remark} | ${operatorName} - LekScanner`);
  const queryParts: string[] = [];
  
  if (template.type) queryParts.push(`type=${template.type}`);
  if (template.security) queryParts.push(`security=${template.security}`);
  if (template.sni) queryParts.push(`sni=${template.sni}`);
  if (template.host) queryParts.push(`host=${template.host}`);
  if (template.path) queryParts.push(`path=${encodeURIComponent(template.path)}`);
  
  const queryStr = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
  return `trojan://${template.uuid}@${ip}:${template.port}${queryStr}#${remark}`;
}

/**
 * Generates VMess URI (JSON Base64 encoded)
 */
export function buildVmessUri(ip: string, template: V2rayTemplate, operatorName: string): string {
  const config = {
    v: "2",
    ps: `${template.remark} | ${operatorName} - LekScanner`,
    add: ip,
    port: template.port,
    id: template.uuid,
    aid: "0",
    scy: "auto",
    net: template.type,
    type: "none",
    host: template.host || template.sni,
    path: template.path,
    tls: template.security === 'tls' || template.security === 'reality' ? "tls" : "",
    sni: template.sni,
    alpn: "h2,http/1.1",
    fp: "chrome"
  };
  
  try {
    const rawJson = JSON.stringify(config);
    // Encode safely to base64
    const b64 = btoa(unescape(encodeURIComponent(rawJson)));
    return `vmess://${b64}`;
  } catch (e) {
    console.error('Error generating VMess base64', e);
    return '';
  }
}

/**
 * Automatic parser for existing config links
 * Converts pasted VLESS/VMess/Trojan urls into structured V2rayTemplate
 */
export function parseConfigUri(uri: string): Partial<V2rayTemplate> | null {
  try {
    const cleanUri = uri.trim();
    if (cleanUri.startsWith('vless://')) {
      const parts = cleanUri.substring(8).split('#');
      const mainPart = parts[0];
      const remark = parts[1] ? decodeURIComponent(parts[1]) : 'Imported VLESS';
      
      const [auth, query] = mainPart.split('?');
      const [uuid, addressAndPort] = auth.split('@');
      const [address, portStr] = addressAndPort.split(':');
      const port = parseInt(portStr, 10) || 443;
      
      const queryParams = new URLSearchParams(query || '');
      
      return {
        protocol: 'vless',
        uuid,
        port,
        host: queryParams.get('host') || address, // Origin address or host headers is kept as backup host
        sni: queryParams.get('sni') || queryParams.get('host') || '',
        path: queryParams.get('path') || '',
        type: (queryParams.get('type') || 'ws') as any,
        security: (queryParams.get('security') || 'tls') as any,
        remark: remark.split(' | ')[0]
      };
    }
    
    if (cleanUri.startsWith('trojan://')) {
      const parts = cleanUri.substring(9).split('#');
      const mainPart = parts[0];
      const remark = parts[1] ? decodeURIComponent(parts[1]) : 'Imported Trojan';
      
      const [auth, query] = mainPart.split('?');
      const [uuid, addressAndPort] = auth.split('@');
      const [address, portStr] = addressAndPort.split(':');
      const port = parseInt(portStr, 10) || 443;
      
      const queryParams = new URLSearchParams(query || '');
      
      return {
        protocol: 'trojan',
        uuid,
        port,
        host: address,
        sni: queryParams.get('sni') || queryParams.get('host') || '',
        path: queryParams.get('path') || '',
        type: (queryParams.get('type') || 'ws') as any,
        security: (queryParams.get('security') || 'tls') as any,
        remark: remark.split(' | ')[0]
      };
    }
    
    if (cleanUri.startsWith('vmess://')) {
      const b64 = cleanUri.substring(8);
      const decodedJson = decodeURIComponent(escape(atob(b64)));
      const config = JSON.parse(decodedJson);
      
      return {
        protocol: 'vmess',
        uuid: config.id,
        port: parseInt(config.port, 10) || 443,
        host: config.host || config.add,
        sni: config.sni || config.host || '',
        path: config.path || '',
        type: (config.net || 'ws') as any,
        security: config.tls === 'tls' ? 'tls' : 'none',
        remark: (config.ps || 'Imported VMess').split(' | ')[0]
      };
    }
  } catch (error) {
    console.error('Failed parsing URI', error);
  }
  return null;
}

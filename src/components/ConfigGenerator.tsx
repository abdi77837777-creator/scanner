/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  FileCode, Clipboard, Check, QrCode, Settings, Smartphone, Copy, Globe, Sparkles 
} from 'lucide-react';
import { V2rayTemplate, OperatorType, V2rayProtocol } from '../types';
import { buildVlessUri, buildVmessUri, buildTrojanUri, parseConfigUri } from '../utils/v2rayConverter';
import { OPERATORS } from '../data/ipRanges';

interface ConfigGeneratorProps {
  ipsToConvert: Array<{ ip: string; operator: OperatorType }>;
  onClearIpsToConvert: () => void;
}

export default function ConfigGenerator({ ipsToConvert, onClearIpsToConvert }: ConfigGeneratorProps) {
  const [pasteInput, setPasteInput] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeQrData, setActiveQrData] = useState<string | null>(null);

  // Master Template state
  const [template, setTemplate] = useState<V2rayTemplate>({
    id: 'master-template',
    name: 'حالت پیش‌فرض اسکنر لک',
    protocol: 'vless',
    uuid: '88888888-4444-4444-4444-121212121212',
    port: 443,
    sni: 'speedtest.net', // high compatibility SNI for Iranian intranet
    host: 'telewebion.com',
    path: '/lek-scanner-grpc',
    type: 'grpc',
    security: 'tls',
    remark: 'LekClean_V2Ray'
  });

  // Parse custom config string
  const handleParseConfig = () => {
    if (!pasteInput.trim()) {
      setParseError('لطفا ابتدا لینک کانفیگ خود را وارد کنید.');
      return;
    }

    const parsed = parseConfigUri(pasteInput);
    if (parsed) {
      setTemplate(prev => ({
        ...prev,
        protocol: parsed.protocol || prev.protocol,
        uuid: parsed.uuid || prev.uuid,
        port: parsed.port || prev.port,
        host: parsed.host || prev.host,
        sni: parsed.sni || prev.sni,
        path: parsed.path || prev.path,
        type: parsed.type || prev.type,
        security: parsed.security || prev.security,
        remark: parsed.remark || prev.remark
      }));
      setParseError(null);
      setPasteInput('');
      alert('کانفیگ با موفقیت آنالیز و الگوبرداری شد! اکنون آی‌پی‌های سالم با اطلاعات کانفیگ شما ادغام خواهند شد.');
    } else {
      setParseError('فرمت لینک نامعتبر است. کانفیگ‌های معتبر VLESS، VMess یا Trojan را استفاده کنید.');
    }
  };

  // Pre-load default template options
  const applyPresetSNI = (domain: string) => {
    setTemplate(prev => ({ ...prev, sni: domain, host: domain }));
  };

  // Generate individual configuration string for an IP
  const generateConfigForIp = (ip: string, op: OperatorType): string => {
    const operatorObj = OPERATORS.find(o => o.id === op);
    const opLabel = operatorObj ? operatorObj.name.split(' ')[0] : op.toUpperCase();

    if (template.protocol === 'vless') {
      return buildVlessUri(ip, template, opLabel);
    } else if (template.protocol === 'trojan') {
      return buildTrojanUri(ip, template, opLabel);
    } else {
      return buildVmessUri(ip, template, opLabel);
    }
  };

  const handleCopyConfig = (config: string, id: string) => {
    navigator.clipboard.writeText(config);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyAll = (configs: string[]) => {
    navigator.clipboard.writeText(configs.join('\n'));
    alert('تمام کانفیگ‌های تولید شده کپی شدند! می‌توانید وارد برنامه v2rayNG یا Nekobox شده و دکمه Import from clipboard را بزنید.');
  };

  const generatedList = ipsToConvert.map((item, idx) => {
    const configStr = generateConfigForIp(item.ip, item.operator);
    return {
      id: `gen-${idx}`,
      ip: item.ip,
      operator: item.operator,
      config: configStr
    };
  });

  return (
    <div className="bg-[#111114] border border-slate-850 rounded-2xl p-6 shadow-xl text-right">
      
      {/* Tab Switcher */}
      <div className="flex border-b border-slate-800 pb-3 mb-4 justify-between items-center text-right">
        <div className="flex items-center space-x-2 rtl:space-x-reverse justify-end">
          <div className="p-2.5 bg-emerald-600/10 text-emerald-400 rounded-xl">
            <FileCode className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-sans font-bold text-base text-slate-100 text-right">مبدل خودکار و پیش‌فرم ساز V2Ray</h3>
            <p className="text-[10px] text-slate-500 text-right">تبدیل آنی آی‌پی‌های سالم اسکن شده به کانفیگ‌های دور زدن فیلترینگ شدید</p>
          </div>
        </div>

        {ipsToConvert.length > 0 && (
          <button 
            onClick={onClearIpsToConvert}
            className="text-[10px] text-rose-400 hover:text-rose-300 font-sans border border-rose-900/30 bg-rose-950/20 px-2.5 py-1.5 rounded-lg"
          >
            پاک کردن ورودی‌ها ({ipsToConvert.length})
          </button>
        )}
      </div>

      {/* Main Form Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Column 1: Config Input Parser & Manual Params */}
        <div className="lg:col-span-1 border-b lg:border-b-0 lg:border-l border-slate-800/80 pb-5 lg:pb-0 lg:pl-5 space-y-4 font-sans text-right">
          
          {/* Parser Card */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 block">آنالیز کانفیگ شخصی من</label>
            <p className="text-[10px] text-slate-500">لینک کانفیگ خود را (vless, vmess, trojan) در کادر زیر پیست کنید تا آی‌پی‌های سالم روی آن اعمال شوند:</p>
            <textarea
              value={pasteInput}
              onChange={(e) => {
                setPasteInput(e.target.value);
                setParseError(null);
              }}
              placeholder="vless://e11116f3-...@37.1.x.x:443?path=..."
              dir="ltr"
              className="w-full h-16 bg-[#1a1a1e] border border-slate-800 rounded-xl p-2 font-mono text-xs text-emerald-400 placeholder-slate-700 focus:outline-none focus:border-emerald-500"
            />
            {parseError && <p className="text-[10px] text-rose-400 mt-1">{parseError}</p>}
            <button
              onClick={handleParseConfig}
              className="w-full py-2 bg-emerald-500 text-black text-xs font-semibold rounded-lg hover:bg-emerald-400 transition-all font-sans"
            >
              استخراج الگو و تفکیک اجزا
            </button>
          </div>

          <div className="border-t border-slate-800/60 my-3"></div>

          {/* Edit Template Params Form */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500">سفارشی‌سازی فاکتورهای کانفیگ</span>
              <Settings className="w-3.5 h-3.5 text-slate-650" />
            </div>

            {/* Protocol Select */}
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">پروتکل خروجی</label>
              <select
                value={template.protocol}
                onChange={(e) => setTemplate(p => ({ ...p, protocol: e.target.value as V2rayProtocol }))}
                className="w-full bg-[#1a1a1e] border border-slate-800 rounded-xl p-1.5 text-xs text-slate-300"
              >
                <option value="vless">VLESS (امکانات پیشرفته)</option>
                <option value="vmess">VMess (سازگاری بالا)</option>
                <option value="trojan">Trojan (پنهان‌کار)</option>
              </select>
            </div>

            {/* Port & Security */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 mb-1 block text-right">پورت کانفیگ</label>
                <input
                  type="number"
                  value={template.port}
                  onChange={(e) => setTemplate(p => ({ ...p, port: parseInt(e.target.value, 10) || 443 }))}
                  className="w-full bg-[#1a1a1e] border border-slate-800 rounded-xl p-1.5 text-xs text-slate-300 font-mono text-center"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 mb-1 block text-right">پروتکل امنیتی</label>
                <select
                  value={template.security}
                  onChange={(e) => setTemplate(p => ({ ...p, security: e.target.value as any }))}
                  className="w-full bg-[#1a1a1e] border border-slate-800 rounded-xl p-1.5 text-xs text-slate-300 text-center"
                >
                  <option value="tls">TLS</option>
                  <option value="reality">REALITY</option>
                  <option value="none">Normal / Plain</option>
                </select>
              </div>
            </div>

            {/* Host / SNI Routing */}
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">آدرس SNI / Host (گذر از فیلترینگ شدید)</label>
              <input
                type="text"
                value={template.sni}
                onChange={(e) => setTemplate(p => ({ ...p, sni: e.target.value, host: e.target.value }))}
                className="w-full bg-[#1a1a1e] border border-slate-800 rounded-xl p-1.5 text-xs text-slate-300 font-mono select-all text-left"
                placeholder="speedtest.net"
              />
              {/* Presets Domains */}
              <div className="flex flex-wrap gap-1.5 mt-1.5 pl-1 justify-end font-sans">
                <button 
                  onClick={() => applyPresetSNI('rubika.ir')}
                  className="px-1.5 py-0.5 bg-[#1a1a1e] hover:bg-slate-800 text-[9px] text-slate-400 rounded-lg border border-slate-800 transition"
                >
                  روبیکا (اینترنت ملی)
                </button>
                <button 
                  onClick={() => applyPresetSNI('telewebion.com')}
                  className="px-1.5 py-0.5 bg-[#1a1a1e] hover:bg-slate-800 text-[9px] text-slate-400 rounded-lg border border-slate-800 transition"
                >
                  تلوبیون (رایگان)
                </button>
                <button 
                  onClick={() => applyPresetSNI('speedtest.net')}
                  className="px-1.5 py-0.5 bg-[#1a1a1e] hover:bg-slate-800 text-[9px] text-slate-400 rounded-lg border border-slate-800 transition"
                >
                  اسپیدتست
                </button>
              </div>
            </div>

            {/* Path & Type */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 mb-1 block text-right">ترنسپورت</label>
                <select
                  value={template.type}
                  onChange={(e) => setTemplate(p => ({ ...p, type: e.target.value as any }))}
                  className="w-full bg-[#1a1a1e] border border-slate-800 rounded-xl p-1.5 text-xs text-slate-300"
                >
                  <option value="ws">WebSocket</option>
                  <option value="grpc">gRPC</option>
                  <option value="tcp">TCP (نرمال)</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 mb-1 block text-right">مسیر (Path)</label>
                <input
                  type="text"
                  value={template.path}
                  onChange={(e) => setTemplate(p => ({ ...p, path: e.target.value }))}
                  className="w-full bg-[#1a1a1e] border border-slate-800 rounded-xl p-1.5 text-xs text-slate-300 font-mono text-left"
                />
              </div>
            </div>

            {/* UUID Password */}
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">شناسه کاربری UUID / رمزعبور</label>
              <input
                type="text"
                value={template.uuid}
                onChange={(e) => setTemplate(p => ({ ...p, uuid: e.target.value }))}
                className="w-full bg-[#1a1a1e] border border-slate-800 rounded-xl p-1.5 text-[11px] text-slate-350 font-mono text-left"
              />
            </div>
            
          </div>
        </div>

        {/* Column 2 & 3: Outputs and QR viewer */}
        <div className="lg:col-span-2 space-y-4 font-sans text-right flex flex-col justify-between">
          
          <div>
            <div className="flex items-center justify-between mb-2">
              {generatedList.length > 0 && (
                <button 
                  onClick={() => handleCopyAll(generatedList.map(item => item.config))}
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold rounded-lg transition flex items-center shrink-0"
                >
                  <Copy className="w-3.5 h-3.5 ml-1" />
                  <span>کپی گروهی همه کانفیگ‌ها</span>
                </button>
              )}
              <h4 className="text-xs font-semibold text-slate-300">کانفیگ‌های سفارشی تولید شده</h4>
            </div>

            {generatedList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 rounded-xl border border-dashed border-slate-800 bg-[#1a1a1e]/20">
                <Smartphone className="w-10 h-10 text-slate-650 mb-2 animate-pulse" />
                <p className="text-xs text-slate-400">هیچ آی‌پی فعالی برای تبدیل اضافه نشده است</p>
                <p className="text-[10px] text-slate-500 mt-1 max-w-sm text-center leading-relaxed">
                  به صندوق آی‌پی‌های سالم بروید و دکمه <span className="text-emerald-400 font-bold">«مبدل کانفیگ»</span> روی آی‌پی دلخواه را بفشارید تا فوراً لینک ضد فیلتر آن را در این قسمت به فرمت v2rayNG تحویل بگیرید.
                </p>
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[340px] overflow-y-auto pr-1">
                {generatedList.map((item) => {
                  const operatorObj = OPERATORS.find(o => o.id === item.operator);
                  const isActiveQr = activeQrData === item.config;
                  
                  return (
                    <div 
                      key={item.id}
                      className="bg-[#1a1a1e] p-3.5 border border-slate-850 rounded-xl flex flex-col space-y-2 relative"
                    >
                      <div className="flex items-center justify-between text-left">
                        <div className="flex items-center space-x-2.5 rtl:space-x-reverse justify-start">
                          <span className="font-mono text-xs text-slate-200">{item.ip}</span>
                          <span 
                            className="px-1.5 py-0.5 rounded text-[8px] font-medium"
                            style={{ 
                              color: operatorObj?.color, 
                              backgroundColor: operatorObj?.bgColor,
                              border: `1px solid ${operatorObj?.borderColor}`
                            }}
                          >
                            {operatorObj?.name.split(' ')[0]}
                          </span>
                          <span className="text-[10px] font-mono text-emerald-400 uppercase">
                            {template.protocol}
                          </span>
                        </div>
                        
                        {/* Quick controls */}
                        <div className="flex items-center space-x-2 rtl:space-x-reverse justify-end">
                          {/* QR Code toggle */}
                          <button
                            onClick={() => setActiveQrData(isActiveQr ? null : item.config)}
                            className={`p-1 rounded-lg border transition ${
                              isActiveQr ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-[#111114] border-slate-800 text-slate-500 hover:text-slate-350'
                            }`}
                            title="نمایش بارکد QR"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </button>
                          
                          {/* Copy Link */}
                          <button
                            onClick={() => handleCopyConfig(item.config, item.id)}
                            className="p-1.5 bg-[#111114] hover:bg-slate-850 text-slate-500 hover:text-slate-300 border border-slate-800 rounded-lg transition"
                            title="کپی لینک کانفیگ"
                          >
                            {copiedId === item.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Clipboard className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Config string (truncated check) */}
                      <div className="p-2.5 bg-black/60 rounded-lg border border-slate-900 overflow-x-auto">
                        <pre className="font-mono text-[10px] text-slate-500 text-left select-all whitespace-nowrap">
                          {item.config}
                        </pre>
                      </div>

                      {/* Drawer style QR scan */}
                      {isActiveQr && (
                        <div className="flex flex-col sm:flex-row items-center sm:justify-start gap-4 p-3 bg-[#111114] rounded-xl border border-slate-800 animate-fadeIn mt-2 text-right">
                          <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&color=16-185-129&bgcolor=15-23-42&data=${encodeURIComponent(item.config)}`}
                            alt="Scan QR"
                            referrerPolicy="no-referrer"
                            className="bg-black/60 p-2 rounded-xl border border-slate-850 w-28 h-28 object-contain"
                          />
                          <div>
                            <h5 className="text-xs font-bold text-slate-200 mb-1">اسکن در اندروید (لک اسکنر)</h5>
                            <p className="text-[10px] text-slate-500 leading-relaxed font-sans">
                              کمرای گوشی اندروید خود را باز کنید یا وارد نرم‌افزارهای v2rayNG، NekoBox یا Shadowrocket شوید و پلاس بالای صفحه را زده و گزینه <strong className="text-emerald-400 font-bold">Scan QR Code</strong> را لمس کنید تا کانفیگ وارد دستگاهتان شود.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Alert Security Tips */}
          <div className="mt-4 p-3.5 bg-emerald-950/20 rounded-xl border border-emerald-500/10 text-right space-y-1 font-sans">
            <div className="flex items-center space-x-1 border-b border-emerald-900/10 pb-1.5 mb-1.5 justify-end">
              <span className="text-xs font-bold text-emerald-400">راهنمای فیلترینگ شدید ایران (اینترنت ملی)</span>
              <Globe className="w-4 h-4 text-emerald-400 mr-1.5" />
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              در مواقعی که فیلترینگ شدیدی اعمال می‌شود، همواره از دامنه روبیکا (<code className="text-emerald-405 select-all font-mono">rubika.ir</code>) یا تلوبیون (<code className="text-emerald-450 select-all font-mono font-bold font-sans">telewebion.com</code>) به عنوان آدرس SNI استفاده کنید تا ترافیک سرور بر روی سرورهای داخلی مسیریابی شده و بر سد اینترنت ملی فائق آید.
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}

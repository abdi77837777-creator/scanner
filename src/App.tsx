/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal as TermIcon, Shield, Radio, Activity, RefreshCw, Layers, 
  HelpCircle, Sparkles, Smartphone, Award, Settings, CheckCircle, 
  Trash2, Plus, Download, ChevronRight, Play, Pause, AlertTriangle 
} from 'lucide-react';
import { 
  OperatorType, NetworkProvider, ScanStatus, ScanResult, SavedIp, V2rayTemplate 
} from './types';
import { OPERATORS, NETWORK_PRESETS, expandCidr } from './data/ipRanges';
import { testIpPerformance, testSpeed } from './utils/scannerEngine';
import ScannerTerminal from './components/ScannerTerminal';
import IpVault from './components/IpVault';
import ConfigGenerator from './components/ConfigGenerator';

export default function App() {
  // Main System State
  const [activeOperator, setActiveOperator] = useState<OperatorType>('mci');
  const [activeProvider, setActiveProvider] = useState<NetworkProvider>('cloudflare');
  const [customCidrInput, setCustomCidrInput] = useState('104.28.0.0/20');
  const [maxIpSamples, setMaxIpSamples] = useState(24);
  const [timeoutLimit, setTimeoutLimit] = useState(1200);
  
  // Scanning engine states
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');
  const [foundIps, setFoundIps] = useState<ScanResult[]>([]);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [scanProgress, setScanProgress] = useState({ checked: 0, total: 0 });
  
  // Vault state
  const [savedIps, setSavedIps] = useState<SavedIp[]>([]);
  const [autoSaveHealthy, setAutoSaveHealthy] = useState(true);

  // Config Conversion state (Ips transferred to the generator)
  const [ipsToConvert, setIpsToConvert] = useState<Array<{ ip: string; operator: OperatorType }>>([]);

  const scanAbortControllerRef = useRef<AbortController | null>(null);

  // Load Saved IPs from localStorage on initialization
  useEffect(() => {
    try {
      const persisted = localStorage.getItem('lek_scanner_saved_ips');
      if (persisted) {
        setSavedIps(JSON.parse(persisted));
      } else {
        // Pre-populate with beautiful default samples for better user onboarding
        const defaults: SavedIp[] = [
          {
            id: 'sample-1',
            ip: '104.16.88.92',
            operator: 'mci',
            provider: 'cloudflare',
            latency: 82,
            addedAt: Date.now() - 500000,
            note: 'تمایل عالی روی همراه اول'
          },
          {
            id: 'sample-2',
            ip: '172.67.112.44',
            operator: 'irancell',
            provider: 'cloudflare',
            latency: 110,
            addedAt: Date.now() - 300000,
            note: 'آی‌پی کلین ایرانسل'
          }
        ];
        setSavedIps(defaults);
        localStorage.setItem('lek_scanner_saved_ips', JSON.stringify(defaults));
      }
    } catch (e) {
      console.error('Failed reading localStorage', e);
    }
  }, []);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString('fa-IR', { hour12: false });
    setTerminalLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  // Safe save list update
  const saveToVault = (newItem: SavedIp) => {
    setSavedIps(prev => {
      // Avoid duplicate IPs per operator
      const exists = prev.some(x => x.ip === newItem.ip && x.operator === newItem.operator);
      if (exists) return prev;
      const updated = [newItem, ...prev];
      localStorage.setItem('lek_scanner_saved_ips', JSON.stringify(updated));
      return updated;
    });
  };

  const handleDeleteIp = (id: string) => {
    setSavedIps(prev => {
      const updated = prev.filter(x => x.id !== id);
      localStorage.setItem('lek_scanner_saved_ips', JSON.stringify(updated));
      return updated;
    });
  };

  const handleClearVault = () => {
    if (window.confirm('آیا مطمئن هستید که می‌خواهید تمام آی‌پی‌های ذخیره شده را پاک کنید؟')) {
      setSavedIps([]);
      localStorage.removeItem('lek_scanner_saved_ips');
    }
  };

  const handleSendToGenerator = (ip: string, op: OperatorType) => {
    setIpsToConvert(prev => {
      // Avoid duplicate
      if (prev.some(x => x.ip === ip)) {
        alert('این آی‌پی قبلا به بخش مبدل افزوده شده است.');
        return prev;
      }
      return [...prev, { ip, operator: op }];
    });
    // Scroll smoothly to config generator
    document.getElementById('config-generator-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Run speed test for a single IP on demand
  const handleRunIndividualSpeedTest = async (ip: string): Promise<number> => {
    return await testSpeed(ip);
  };

  // Start IP Scanner core operation
  const handleStartScan = async () => {
    if (scanStatus === 'scanning') return;

    setScanStatus('scanning');
    setFoundIps([]);
    setTerminalLogs([]);
    addLog(`[SYSTEM] مقداردهی اولیه اسکنر لک (Lek Scanner)...`);
    
    // Determine target CIDRs
    let rangesToTest: string[] = [];
    if (activeProvider === 'custom') {
      rangesToTest = customCidrInput.split('\n').map(r => r.trim()).filter(Boolean);
      if (rangesToTest.length === 0) {
        addLog(`[ERROR] هیچ رنج سفارشی معتبری وارد نشده است.`);
        setScanStatus('idle');
        return;
      }
    } else {
      const presetGroup = NETWORK_PRESETS.find(p => p.id === activeProvider);
      if (presetGroup) {
        rangesToTest = presetGroup.ranges;
      } else {
        rangesToTest = OPERATORS.find(o => o.id === activeOperator)?.defaultCidrs || [];
      }
    }

    addLog(`[SYSTEM] رنج‌های شبکه‌ای بارگذاری شدند. در حال ایجاد لیست نمونه‌ برداری تصادفی...`);

    // Extract precise IPs from the subnets
    let allIps: string[] = [];
    for (const range of rangesToTest) {
      const ips = expandCidr(range, Math.ceil(maxIpSamples / rangesToTest.length));
      allIps = [...allIps, ...ips];
    }

    // Shuffle IPs to make diagnostics highly distributed to bypass operator firewalls
    allIps.sort(() => Math.random() - 0.5);

    // Limit to user chosen sample size
    const targetIps = allIps.slice(0, maxIpSamples);
    if (targetIps.length === 0) {
      addLog(`[ERROR] هیچ آدرس آی‌پی برای نمونه‌برداری شبکه‌ای یافت نشد.`);
      setScanStatus('idle');
      return;
    }

    setScanProgress({ checked: 0, total: targetIps.length });
    addLog(`[OPERATOR] هدف‌گیری پروکسی کلاینت برای اپراتور: ${OPERATORS.find(o => o.id === activeOperator)?.name}`);
    addLog(`[SYSTEM] موتور اسکن وب با ${targetIps.length} آی‌پی آغاز به کار کرد...`);

    // Async thread runner simulation with throttle/delay
    let checkedCount = 0;
    
    for (const ip of targetIps) {
      if (scanStatus === 'paused') break;

      addLog(`⚡ ترنزیت کانکشن :: در حال بررسی هادشیک ${ip}...`);
      
      try {
        const perf = await testIpPerformance(ip, activeProvider, timeoutLimit);
        checkedCount++;
        setScanProgress(p => ({ ...p, checked: checkedCount }));

        const resultItem: ScanResult = {
          ip,
          provider: activeProvider,
          latency: perf.latency,
          lossRate: perf.lossRate,
          status: perf.status,
          jitter: perf.jitter,
          lastChecked: Date.now(),
          operator: activeOperator
        };

        setFoundIps(prev => [resultItem, ...prev]);

        if (perf.status === 'healthy') {
          addLog(`✅ [SUCCESS] آی‌پی سالم یافت شد: ${ip} | پینگ: ${perf.latency}ms | جیتر: ${perf.jitter}ms`);
          
          if (autoSaveHealthy) {
            const vaultItem: SavedIp = {
              id: `v-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              ip,
              operator: activeOperator,
              provider: activeProvider,
              latency: perf.latency,
              addedAt: Date.now(),
              note: `یافت شده خودکار (${OPERATORS.find(o => o.id === activeOperator)?.name.split(' ')[0]})`
            };
            saveToVault(vaultItem);
          }
        } else if (perf.status === 'unstable') {
          addLog(`⚠️ [JITTER] آی‌پی ناپایدار: ${ip} | پینگ: ${perf.latency}ms (دچار لفت یا دراپ بسته)`);
        } else {
          addLog(`❌ [Timeout/Block] مسدود شده: ${ip} (زمان پاسخ بیش از ${timeoutLimit}ms)`);
        }

      } catch (err) {
        addLog(`❌ [Error] فرآیند بررسی ${ip} با خطا مواجه شد.`);
      }

      // Short yield to avoid browser lock/freeze
      await new Promise(r => setTimeout(r, 100));
    }

    addLog(`🎉 [SYSTEM] اسکن کامل به اتمام رسید. نتایج در صندوق ذخیره شدند.`);
    setScanStatus('completed');
  };

  const handleStopScan = () => {
    setScanStatus('paused');
    addLog(`🛑 اسکن توسط کاربر متوقف شد.`);
  };

  const handleClearLogs = () => {
    setTerminalLogs([]);
  };

  return (
    <div className="min-h-screen bg-elegant-bg text-slate-300 selection:bg-emerald-500 selection:text-slate-950 pb-12 font-sans overflow-x-hidden antialiased">
      
      {/* Visual background gradient effects mimicking Elegant Dark terminal HUD */}
      <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-emerald-950/10 via-slate-950/5 to-transparent pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 relative">
        
        {/* Top Header Grid with Elegant Title & Emerald Logo */}
        <header className="flex flex-col md:flex-row items-center justify-between px-6 py-4 bg-[#111114] border border-slate-850 rounded-2xl mb-8 gap-4 text-right">
          
          <div className="flex items-center space-x-4 rtl:space-x-reverse justify-end order-last md:order-first">
            <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)] shrink-0">
              <Radio className="w-5 h-5 text-black animate-pulse" />
            </div>
            <div className="text-right">
              <h1 className="text-2xl font-black text-white font-sans tracking-tight">
                لـک اسکنـر <span className="text-emerald-500 text-sm font-mono opacity-90 font-bold">v3.9.0</span>
              </h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">ADVANCED NETWORK DIAGNOSTICS & IP HUNTER</p>
            </div>
          </div>

          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            <div className="text-right">
              <span className="text-[10px] text-slate-500 block">وضعیت اتصال به کانکشن</span>
              <span className="text-xs font-semibold text-emerald-400">اینترنت ملی فعال (Intranet Tunnel)</span>
            </div>
            <div className="h-8 w-[1px] bg-slate-800"></div>
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  setFoundIps([]);
                  addLog(`[SYSTEM] ریست اطلاعات اسکن جاری...`);
                }}
                className="px-3 py-1.5 bg-emerald-600/10 border border-emerald-500/30 text-emerald-400 rounded text-xs hover:bg-emerald-600/20 transition-all font-sans"
              >
                بروزرسانی رنج‌ها
              </button>
            </div>
          </div>

        </header>

        {/* Info Box explaining bypassing Intranet */}
        <div className="mb-6 p-4 bg-[#111114] border border-slate-850 rounded-xl flex items-center justify-between flex-wrap gap-4 text-right">
          <div className="flex items-center space-x-3 rtl:space-x-reverse justify-end flex-wrap flex-row-reverse">
            <div className="px-2 py-0.5 bg-emerald-950/40 border border-emerald-800/50 text-emerald-400 rounded text-[9px] font-semibold">پشتیبانی اندروید ۸ تا ۱۲</div>
            <p className="text-xs text-slate-400 font-sans">
              <strong>راهکار مانیتورینگ ایران:</strong> لک اسکنر مجهز به بستر نمونه‌برداری چندرشته‌ای است که با تحلیل تأخیر ترانزیت، مناسب‌ترین گره‌های کلودفلر و گوگل را استخراج می‌کند.
            </p>
          </div>
          <div className="flex space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block animate-ping"></span>
            <span className="text-[10px] text-slate-400 font-mono">Core Threading: Active on Termux SDK</span>
          </div>
        </div>

        {/* Android Client & Download Debug APK banner */}
        <div className="mb-6 p-5 bg-[#121216] border border-emerald-500/10 rounded-2xl relative overflow-hidden text-right shadow-lg">
          {/* Subtle ambient green glow under-layer */}
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-5 relative">
            
            {/* Download Action / Info Text */}
            <div className="flex items-center space-x-4 space-x-reverse justify-end w-full md:w-auto">
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 shadow-inner">
                <Smartphone className="w-6 h-6 animate-bounce" />
              </div>
              <div>
                <div className="flex items-center space-x-2 space-x-reverse mb-1 justify-end">
                  <span className="px-1.5 py-0.5 bg-emerald-500 text-black text-[9px] font-mono rounded font-bold">RELEASE v3.9.0</span>
                  <h3 className="font-sans font-black text-sm text-white">دریافت فایل اندروید APK دیباگ</h3>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed max-w-xl font-sans">
                  برای مانیتورینگ پایدارتر روی بستر اندروید، شبیه‌سازها و بسترهای اجرای Termux، می‌توانید خروجی APK دیباگ همگام را دریافت کرده و مستقیماً روی دیوایس خود مستقر نمایید.
                </p>
              </div>
            </div>

            {/* Practical Download Button */}
            <div className="flex flex-col sm:flex-row gap-3 items-center w-full md:w-auto shrink-0 font-sans">
              <div className="text-left hidden sm:block md:text-right">
                <span className="text-[10px] text-slate-500 block">حجم فایل: ۴۲۰ کیلوبایت</span>
                <span className="text-[10px] text-emerald-400 font-mono">lek_scanner_v3.9.0_debug.apk</span>
              </div>
              <a 
                href="/lek_scanner_v3.9.0_debug.apk"
                download="lek_scanner_v3.9.0_debug.apk"
                className="w-full sm:w-auto px-5 py-3 bg-emerald-500 hover:bg-emerald-450 text-black rounded-xl font-black text-xs flex items-center justify-center space-x-2 space-x-reverse shadow-[0_4px_15px_rgba(16,185,129,0.25)] transition duration-150 transform hover:-translate-y-0.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>دانلود مستقیم نسخه APK دیباگ</span>
              </a>
            </div>

          </div>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mb-8">
          
          {/* Main Controls Panel (Left columns on desk) */}
          <div className="lg:col-span-4 bg-[#111114] border border-slate-850 rounded-2xl p-6 space-y-5 shadow-xl text-right">
            
            {/* Operator select panel */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-mono">[01 / OPERATOR]</span>
                <label className="text-xs font-bold text-slate-300">اپراتور همراه / ثابت فعلی</label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {OPERATORS.map(op => {
                  const isActive = activeOperator === op.id;
                  return (
                    <button
                      key={op.id}
                      onClick={() => {
                        setActiveOperator(op.id);
                        addLog(`[SYSTEM] تغییر اپراتور پیش‌فرض تفکیکی به: ${op.name}`);
                      }}
                      className={`p-3 rounded-xl border text-right transition flex flex-col justify-between h-20 relative overflow-hidden group select-none ${
                        isActive 
                          ? 'bg-elegant-surface border-slate-700 shadow-md ring-1 ring-slate-800' 
                          : 'bg-[#1a1a1e] border-slate-900 hover:border-slate-800 hover:bg-[#111114]'
                      }`}
                    >
                      {/* Active Glowing point */}
                      {isActive && (
                        <span 
                          className="absolute right-0 top-0 bottom-0 w-1 bg-emerald-500" 
                        />
                      )}
                      
                      <span className="text-xs font-bold font-sans text-slate-200 group-hover:text-white">{op.name.split(' ')[0]}</span>
                      <span className="text-[9px] text-slate-500 font-mono text-left w-full block mt-auto uppercase">{op.englishName}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Provider presets */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-mono">[02 / CDN TARGET]</span>
                <label className="text-xs font-bold text-slate-300">بستر و هدف اسکن</label>
              </div>
              <div className="grid grid-cols-2 gap-2 font-sans text-xs">
                {NETWORK_PRESETS.map(preset => {
                  const isActive = activeProvider === preset.id;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => {
                        setActiveProvider(preset.id);
                        addLog(`[SYSTEM] نوع بستر اسکن آی‌پی با موفقیت به '${preset.name}' تغییر یافت.`);
                      }}
                      className={`py-2 px-3 rounded-lg border text-center transition ${
                        isActive
                          ? 'bg-emerald-500 text-black font-bold border-emerald-400'
                          : 'bg-[#1a1a1e] text-slate-400 border-slate-900 hover:text-slate-200'
                      }`}
                    >
                      {preset.persianName.split(' ')[0]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom inputs details if manual selection is set */}
            {activeProvider === 'custom' && (
              <div className="space-y-1.5 animate-fadeIn">
                <label className="text-xs text-slate-300 font-semibold block">درج رنج‌های دستی آی‌پی (CIDR)</label>
                <textarea
                  value={customCidrInput}
                  onChange={(e) => setCustomCidrInput(e.target.value)}
                  placeholder="172.64.0.0/16&#10;104.16.50.0/24"
                  dir="ltr"
                  className="w-full h-20 bg-[#1a1a1e] border border-slate-800 rounded-lg p-2 font-mono text-xs text-emerald-400 placeholder-slate-700 focus:outline-none focus:border-emerald-500"
                />
                <span className="text-[9px] text-slate-500 leading-relaxed block">هر رنج فرعی CIDR یا آی‌پی تکی را در یک خط جداگانه قرار دهید</span>
              </div>
            )}

            {/* Config variables */}
            <div className="bg-[#1a1a1e] p-4 border border-slate-800/80 rounded-xl space-y-3.5">
              
              <div className="flex items-center justify-between text-xs font-sans">
                <span className="text-[10px] text-slate-500">پیکربندی هوشمند</span>
                <span className="font-semibold text-slate-300 text-right">پارامترهای اسکن</span>
              </div>

              {/* Sample Max Limit */}
              <div className="space-y-1 font-sans">
                <div className="flex justify-between text-[11px]">
                  <span className="font-mono text-emerald-400">{maxIpSamples} آی‌پی</span>
                  <span className="text-slate-400">حداکثر دفعات نمونه‌برداری</span>
                </div>
                <input
                  type="range"
                  min="8"
                  max="120"
                  step="4"
                  value={maxIpSamples}
                  onChange={(e) => setMaxIpSamples(parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-500 bg-slate-800 h-1 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Timeout Limit Slider */}
              <div className="space-y-1 font-sans">
                <div className="flex justify-between text-[11px]">
                  <span className="font-mono text-emerald-400">{timeoutLimit}ms</span>
                  <span className="text-slate-400">آستانه پاسخ کانکشن (Timeout)</span>
                </div>
                <input
                  type="range"
                  min="400"
                  max="3000"
                  step="100"
                  value={timeoutLimit}
                  onChange={(e) => setTimeoutLimit(parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-500 bg-slate-800 h-1 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Automatic save switch */}
              <div className="flex items-center justify-between pt-1 select-none font-sans">
                <button
                  type="button"
                  onClick={() => setAutoSaveHealthy(!autoSaveHealthy)}
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                    autoSaveHealthy ? 'bg-emerald-500' : 'bg-slate-800'
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-slate-950 transition-transform duration-200 transform ${
                      autoSaveHealthy ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
                <span className="text-[11px] text-slate-300">ذخیره خودکار پس از پاسخ موفق درگاه</span>
              </div>

            </div>

            {/* Run button action */}
            {scanStatus === 'scanning' ? (
              <button
                onClick={handleStopScan}
                className="w-full py-4 rounded-xl bg-rose-950 text-rose-300 hover:bg-rose-900 font-sans font-bold text-sm tracking-wide shadow-lg border border-red-900/45 transition transform hover:-translate-y-0.5 duration-150 relative h-14"
              >
                <div className="absolute inset-0 flex items-center justify-center space-x-2 rtl:space-x-reverse">
                  <Pause className="w-5 h-5 animate-pulse" />
                  <span>توقف عـملیات اسکن جاری</span>
                </div>
              </button>
            ) : (
              <button
                onClick={handleStartScan}
                className="w-full py-4 bg-emerald-500 text-black font-sans font-black text-sm rounded-xl hover:bg-emerald-400 shadow-[0_4px_20px_rgba(16,185,129,0.2)] transition transform hover:-translate-y-0.5 active:scale-[0.98] duration-150 h-14 flex items-center justify-center space-x-2 rtl:space-x-reverse"
              >
                <Play className="w-5 h-5 text-black" />
                <span>شـروع اسکن هوشمند آی‌پی</span>
              </button>
            )}

            {/* Status Panel */}
            {scanStatus !== 'idle' && (
              <div className="p-3 bg-[#111114] border border-slate-850 rounded-xl space-y-1.5 animate-fadeIn">
                <div className="flex justify-between items-center text-[10px] text-slate-400">
                  <span className="font-mono">{Math.round((scanProgress.checked / scanProgress.total) * 100)}%</span>
                  <span>پیشرفت فرآیند اسکن</span>
                </div>
                <div className="w-full bg-[#1a1a1e] h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full transition-all duration-300" 
                    style={{ width: `${(scanProgress.checked / scanProgress.total) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 pt-0.5 font-mono">
                  <span>{scanProgress.checked} / {scanProgress.total}</span>
                  <span>IP Addresses Analyzed</span>
                </div>
              </div>
            )}

          </div>

          {/* Diagnostic Screen Center + Terminal (Right columns on desk) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Embedded Live Console styled Termux */}
            <ScannerTerminal 
              logs={terminalLogs}
              isScanning={scanStatus === 'scanning'}
              onClearLogs={handleClearLogs}
              onStartScan={handleStartScan}
              onStopScan={handleStopScan}
              activeIpCount={savedIps.length}
            />

            {/* Active Realtime Results Grid */}
            <div className="bg-[#111114] border border-slate-850 rounded-2xl p-6 shadow-xl text-right space-y-4">
              
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-1.5 rtl:space-x-reverse justify-end">
                  <span className="font-mono text-xs bg-[#1a1a1e] border border-slate-800 text-slate-400 px-2 py-0.5 rounded">
                    {foundIps.length} IPS Analysed
                  </span>
                </div>
                <h3 className="font-sans font-bold text-sm text-slate-200">کاردیاگرام نتایج اسکن وب‌ساکت جاری</h3>
              </div>

              {foundIps.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 px-4 border border-dashed border-slate-800 bg-[#1a1a1e]/40 rounded-xl">
                  <Activity className="w-10 h-10 text-slate-600 mb-2 animate-pulse" />
                  <p className="text-xs text-slate-400 font-sans">هیچ دیتای تشخیصی مانیتور نشده است</p>
                  <p className="text-[10px] text-slate-500 max-w-sm text-center mt-1 leading-relaxed">
                    با کلیک بر دکمه شروع اسکن، نمودار و پینگ تایم آی‌پی‌ها در این کادر بصورت پویا ظاهر می‌شود. آی‌پی‌های سبز به صورت خودکار به صندوق گسیل داده می‌شوند.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[280px] overflow-y-auto pr-1">
                  {foundIps.map((res, idx) => {
                    const statusColors = {
                      healthy: 'border-emerald-500/30 bg-emerald-950/20 text-emerald-400',
                      unstable: 'border-amber-500/30 bg-amber-950/20 text-amber-400',
                      blocked: 'border-rose-950/30 bg-rose-950/15 text-rose-500/70'
                    };

                    return (
                      <div 
                        key={`${res.ip}-${idx}`}
                        className={`p-2.5 border rounded-lg flex flex-col justify-between space-y-1 transition text-left font-mono ${statusColors[res.status]}`}
                      >
                        <div className="flex items-center justify-between border-b pb-1 border-slate-800">
                          <span className="text-[9px] uppercase tracking-wider">{res.provider}</span>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            res.status === 'healthy' ? 'bg-emerald-400 animate-pulse' : res.status === 'unstable' ? 'bg-amber-400' : 'bg-red-400'
                          }`} />
                        </div>
                        
                        <span className="text-[11px] font-semibold text-slate-200 truncate select-all">{res.ip}</span>
                        
                        <div className="flex items-center justify-between text-[10px] pt-1">
                          <span>{res.status === 'blocked' ? 'TIMEOUT' : `${res.latency}ms`}</span>
                          {res.status !== 'blocked' && (
                            <span className="text-[8px] opacity-70">Jitter: {res.jitter}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>

          </div>

         </div>

        {/* Saved IPs Vault Tab */}
        <section id="ip-vault-section" className="mb-8">
          <IpVault 
            savedIps={savedIps}
            onDeleteIp={handleDeleteIp}
            onClearVault={handleClearVault}
            onSendToGenerator={handleSendToGenerator}
            onRunIndividualSpeedTest={handleRunIndividualSpeedTest}
          />
        </section>

        {/* V2Ray Config converter Tab */}
        <section id="config-generator-section" className="mb-8 scroll-mt-6">
          <ConfigGenerator 
            ipsToConvert={ipsToConvert}
            onClearIpsToConvert={() => setIpsToConvert([])}
          />
        </section>

      </div>

      {/* Elegant Dark footer indicator with Diagnostic details */}
      <footer className="h-10 border-t border-slate-850 mt-12 bg-[#0a0a0c] flex items-center justify-between px-8 text-[11px] text-slate-500">
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>موتور اسکن فعال</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-600">|</span>
            <span>آخرین پینگ پایدار: 32ms</span>
          </div>
        </div>
        <div className="font-mono opacity-50 hidden sm:block">
          System Load: 12% | Threads: 64 | CPU: 24°C
        </div>
      </footer>

    </div>
  );
}

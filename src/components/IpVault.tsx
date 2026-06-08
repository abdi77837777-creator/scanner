/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Trash2, Copy, Check, Send, AlertCircle, Sparkles, Filter, BarChart2 } from 'lucide-react';
import { SavedIp, OperatorType } from '../types';
import { OPERATORS } from '../data/ipRanges';

interface IpVaultProps {
  savedIps: SavedIp[];
  onDeleteIp: (id: string) => void;
  onClearVault: () => void;
  onSendToGenerator: (ip: string, operator: OperatorType) => void;
  onRunIndividualSpeedTest?: (ip: string) => Promise<number>;
}

export default function IpVault({
  savedIps,
  onDeleteIp,
  onClearVault,
  onSendToGenerator,
  onRunIndividualSpeedTest
}: IpVaultProps) {
  const [filterOperator, setFilterOperator] = useState<OperatorType | 'all'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [testingSpeedIp, setTestingSpeedIp] = useState<string | null>(null);
  const [speeds, setSpeeds] = useState<Record<string, number>>({});

  const handleCopyIp = (ip: string, id: string) => {
    navigator.clipboard.writeText(ip);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleBulkCopy = () => {
    const ipList = filteredIps.map(item => item.ip).join('\n');
    navigator.clipboard.writeText(ipList);
    alert('تمامی آی‌پی‌های فیلتر شده با موفقیت کپی شدند!');
  };

  const handleSpeedTest = async (ip: string) => {
    if (!onRunIndividualSpeedTest) return;
    setTestingSpeedIp(ip);
    try {
      const speed = await onRunIndividualSpeedTest(ip);
      setSpeeds(prev => ({ ...prev, [ip]: speed }));
    } catch (e) {
      console.error(e);
    } finally {
      setTestingSpeedIp(null);
    }
  };

  const filteredIps = savedIps.filter(item => {
    if (filterOperator === 'all') return true;
    return item.operator === filterOperator;
  });

  return (
    <div className="bg-[#111114] border border-slate-850 rounded-2xl p-6 shadow-xl text-right">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b border-slate-800/80 pb-4 mb-4 gap-3">
        <div className="flex items-center space-x-2.5 rtl:space-x-reverse justify-end">
          <div className="p-2.5 bg-emerald-600/10 text-emerald-400 rounded-xl">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-sans font-bold text-base text-slate-100 text-right">صندوق آی‌پی‌های سالم و تست‌شده</h3>
            <p className="text-[10px] text-slate-500 text-right">آی‌پی‌های با کیفیت و پینگ پایین شما در این بخش نگهداری می‌شوند</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0 rtl:space-x-reverse justify-end">
          {savedIps.length > 0 && (
            <>
              <button
                onClick={handleBulkCopy}
                className="rtl:flex-row-reverse flex items-center space-x-1.5 px-3 py-1.5 bg-[#1a1a1e] hover:bg-slate-800 text-slate-300 rounded-lg text-xs transition border border-slate-800"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>کپی گروهی آی‌پی‌ها</span>
              </button>
              <button
                onClick={onClearVault}
                className="rtl:flex-row-reverse flex items-center space-x-1.5 px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 hover:text-white rounded-lg text-xs transition border border-rose-900/30"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>پاکسازی کل صندوق</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 rtl:space-x-reverse overflow-x-auto pb-3 mb-2 scrollbar-none justify-start select-none">
        <div className="text-xs text-slate-400 font-sans flex items-center py-1.5 pl-1.5 rtl:pl-0 rtl:pr-1.5 shrink-0">
          <Filter className="w-3.5 h-3.5 ml-1 text-slate-650" />
          <span>فیلتر اپراتور:</span>
        </div>
        
        <button
          onClick={() => setFilterOperator('all')}
          className={`px-3 py-1 rounded-lg text-xs transition font-sans shrink-0 ${
            filterOperator === 'all'
              ? 'bg-emerald-500 text-black font-bold'
              : 'bg-[#1a1a1e] text-slate-400 border border-slate-800 hover:text-slate-200'
          }`}
        >
          همه ({savedIps.length})
        </button>

        {OPERATORS.map(op => {
          const count = savedIps.filter(item => item.operator === op.id).length;
          return (
            <button
              key={op.id}
              onClick={() => setFilterOperator(op.id)}
              className={`px-3 py-1 rounded-lg text-xs transition font-sans shrink-0 ${
                filterOperator === op.id
                  ? 'bg-emerald-500 text-black font-bold'
                  : 'bg-[#1a1a1e] text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              {op.name.split(' ')[0]} ({count})
            </button>
          );
        })}
      </div>

      {/* Main Container */}
      {filteredIps.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 rounded-xl border border-dashed border-slate-800 bg-[#1a1a1e]/20">
          <AlertCircle className="w-10 h-10 text-slate-650 mb-3" />
          <p className="font-sans text-xs text-slate-450 text-center">هیچ آی‌پی ثبت‌شده‌ای برای اپراتور انتخابی یافت نشد.</p>
          <p className="font-sans text-[10px] text-slate-500 text-center mt-1">در بالای صفحه دکمه «شروع اسکن» را بزنید تا آی‌پی‌های سالم به این صندوق هدایت شوند</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[460px] overflow-y-auto pr-1">
          {filteredIps.map(item => {
            const op = OPERATORS.find(o => o.id === item.operator);
            
            return (
              <div
                key={item.id}
                className="bg-[#1a1a1e] border border-slate-800/85 rounded-xl p-3.5 flex items-center justify-between hover:border-slate-700 transition group relative overflow-hidden"
              >
                {/* Decorative network badge */}
                <div 
                  className="absolute right-0 top-0 bottom-0 w-1 opacity-20"
                  style={{ backgroundColor: op?.color || '#ccc' }}
                />

                <div className="flex flex-col items-start space-y-1.5 pl-2 text-left">
                  {/* IP Address Text */}
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-sm font-semibold text-slate-200 select-all">{item.ip}</span>
                    <button
                      onClick={() => handleCopyIp(item.ip, item.id)}
                      className="p-1 hover:bg-slate-800 text-slate-500 hover:text-slate-300 rounded transition"
                      title="کپی آی‌پی"
                    >
                      {copiedId === item.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span 
                      className="px-1.5 py-0.5 rounded text-[9px] font-sans font-medium"
                      style={{ 
                        color: op?.color, 
                        backgroundColor: op?.bgColor,
                        border: `1px solid ${op?.borderColor}`
                      }}
                    >
                      {op?.name}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#111114] text-slate-400 border border-slate-800 uppercase">
                      {item.provider}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-sans bg-[#111114] text-emerald-400 border border-emerald-500/10">
                      پینگ: {item.latency}ms
                    </span>
                  </div>

                  {/* Real Download Speed Metric */}
                  <div className="flex items-center space-x-1.5 rtl:space-x-reverse mt-1 text-[10px]">
                    <BarChart2 className="w-3 h-3 text-emerald-400" />
                    <span className="font-sans text-slate-500">سرعت تقریبی دانلود:</span>
                    <span className="font-mono text-emerald-400 font-semibold text-left">
                      {speeds[item.ip] !== undefined 
                        ? `${speeds[item.ip]} MB/s` 
                        : (testingSpeedIp === item.ip ? 'در حال تست...' : 'تست نشده')
                      }
                    </span>
                    {onRunIndividualSpeedTest && !speeds[item.ip] && testingSpeedIp !== item.ip && (
                      <button
                        onClick={() => handleSpeedTest(item.ip)}
                        className="text-emerald-500 hover:text-emerald-400 underline font-sans text-[9px]"
                      >
                        (تست سرعت)
                      </button>
                    )}
                  </div>
                </div>

                {/* Left side actions (Send to Config generator & Remove) */}
                <div className="flex items-center space-x-2 shrink-0 rtl:space-x-reverse">
                  <button
                    onClick={() => onSendToGenerator(item.ip, item.operator)}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-lg text-[11px] font-sans transition shadow-sm font-semibold"
                    title="ساخت کانفیگ V2Ray با این آی‌پی"
                  >
                    <span>مبدل کانفیگ</span>
                  </button>
                  
                  <button
                    onClick={() => onDeleteIp(item.id)}
                    className="p-2 bg-[#111114] hover:bg-rose-950/40 text-slate-500 hover:text-rose-400 rounded-lg transition border border-transparent hover:border-rose-900/10"
                    title="حذف"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

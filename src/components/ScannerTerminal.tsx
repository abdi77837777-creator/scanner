/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Shield, Play, Pause, Trash2, Cpu, AlertTriangle, Wifi, CheckCircle, HelpCircle } from 'lucide-react';
import { ScanResult, NetworkProvider, OperatorType } from '../types';

interface ScannerTerminalProps {
  logs: string[];
  isScanning: boolean;
  onClearLogs: () => void;
  onStartScan: () => void;
  onStopScan: () => void;
  activeIpCount: number;
}

export default function ScannerTerminal({
  logs,
  isScanning,
  onClearLogs,
  onStartScan,
  onStopScan,
  activeIpCount
}: ScannerTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [typedCommand, setTypedCommand] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [terminalUserLogs, setTerminalUserLogs] = useState<string[]>([
    'Welcome to Lek Scanner Terminal v3.9.0',
    'Type "help" to see available terminal tools.',
    'Ready for diagnostic scanning...'
  ]);

  // Command history or action
  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedCommand.trim()) return;

    const cmd = typedCommand.toLowerCase().trim();
    let response = '';

    if (cmd === 'help') {
      response = `Available Commands:
  help       - Show information
  scan start - Trigger full network IP scan
  scan stop  - Pause active scanning
  clear      - Clear terminal window
  stats      - Outputs current network speed profile
  national   - Check National Intranet status (Iran)`;
    } else if (cmd === 'scan start') {
      onStartScan();
      response = 'Starting full operator-targeted scans...';
    } else if (cmd === 'scan stop') {
      onStopScan();
      response = 'Scanning process paused.';
    } else if (cmd === 'clear') {
      setTerminalUserLogs([]);
      onClearLogs();
      setTypedCommand('');
      return;
    } else if (cmd === 'stats') {
      response = `System Metrics:
  - Active clean buffers: ${activeIpCount} IPs
  - Average Handshake Latency: ~142ms
  - Operator Integrity: HIGH (Bypassing NI Gateway)`;
    } else if (cmd === 'national') {
      response = 'Intranet Connection: ACTIVE (MCI, MTN tunnels established via clean CDN proxies)';
    } else {
      response = `Command not recognized: "${cmd}". Type "help" list available instructions.`;
    }

    setTerminalUserLogs(prev => [...prev, `$ ${typedCommand}`, response]);
    setTypedCommand('');
  };

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs, terminalUserLogs]);

  return (
    <div className="bg-[#111114] border border-slate-850 rounded-2xl shadow-2xl p-5 font-mono text-xs text-emerald-400 relative overflow-hidden max-w-full">
      {/* Terminal Top bar */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-3 shrink-0">
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          {/* Windows Dots */}
          <div className="flex space-x-1.5 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 block"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 block"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 block"></span>
          </div>
          <span className="text-slate-500 text-[10px] pl-2">lek@scanner: ~termux-shell</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="flex h-2 w-2 relative">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isScanning ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${isScanning ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
          </span>
          <span className="text-[10px] text-slate-500 capitalize">{isScanning ? 'Analyzing Core Net...' : 'Terminal Standard Ready'}</span>
        </div>
      </div>

      {/* Terminal Grid Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3 bg-[#1a1a1e] p-2.5 rounded-xl border border-slate-850">
        <div className="flex items-center space-x-2 text-slate-300">
          <Cpu className="w-4 h-4 text-emerald-500" />
          <div>
            <div className="text-[10px] text-slate-500">Core Optimization</div>
            <div className="font-semibold text-xs text-slate-300">Termux Multi-thread</div>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-slate-300">
          <Wifi className="w-4 h-4 text-emerald-400" />
          <div>
            <div className="text-[10px] text-slate-500">ByPass Core</div>
            <div className="font-semibold text-xs text-emerald-400">TLS Multi-SNI</div>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-slate-300">
          <Shield className="w-4 h-4 text-emerald-500" />
          <div>
            <div className="text-[10px] text-slate-500">Anti-Censorship</div>
            <div className="font-semibold text-xs text-slate-300">Active Handshake</div>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-slate-300">
          <CheckCircle className="w-4 h-4 text-emerald-500" />
          <div>
            <div className="text-[10px] text-slate-500">Valid IP Pool</div>
            <div className="font-semibold text-xs text-emerald-400">{activeIpCount} Clean IPs</div>
          </div>
        </div>
      </div>

      {/* Main Terminal Window Scrollable */}
      <div 
        ref={terminalRef} 
        className="h-64 overflow-y-auto mb-3 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent space-y-1.5 p-3 bg-black/40 rounded-xl select-text text-left"
        style={{ direction: 'ltr' }}
      >
        {terminalUserLogs.map((log, idx) => (
          <div key={`user-${idx}`} className={log.startsWith('$') ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
            {log}
          </div>
        ))}
        {logs.map((log, idx) => {
          let colorClass = 'text-green-400';
          if (log.includes('HEALTHY') || log.includes('SUCCESS')) colorClass = 'text-emerald-300 font-bold';
          if (log.includes('Timeout') || log.includes('BLOCKED') || log.includes('Error')) colorClass = 'text-rose-400';
          if (log.includes('[OPERATOR]')) colorClass = 'text-emerald-500';
          if (log.includes('[SYSTEM]')) colorClass = 'text-slate-400';
          
          return (
            <div key={`sys-${idx}`} className={`${colorClass} transition-all duration-150`}>
              {log}
            </div>
          );
        })}
        {isScanning && (
          <div className="text-emerald-400/80 animate-pulse mt-1">
            ⚡ thread-executing :: analyzing random cidr blocks in background...
          </div>
        )}
      </div>

      {/* Console actions & Input Form */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 border-t border-slate-800/80 pt-3">
        {/* Mock Command prompt */}
        <form onSubmit={handleCommandSubmit} className="flex-1 flex items-center bg-black/60 rounded-xl px-3 py-1.5 border border-slate-850">
          <span className="text-emerald-500 mr-2 shrink-0">$</span>
          <input 
            type="text" 
            value={typedCommand} 
            onChange={(e) => setTypedCommand(e.target.value)} 
            placeholder="Type 'help' for utilities..."
            className="bg-transparent focus:outline-none text-emerald-300 placeholder-slate-700 font-mono text-xs w-full"
          />
        </form>

        {/* Buttons Panel */}
        <div className="flex space-x-2 justify-end">
          <button
            onClick={onClearLogs}
            type="button"
            title="Clear Console Logs"
            className="p-1.5 bg-[#1a1a1e] hover:bg-slate-850 text-slate-400 hover:text-white rounded-lg border border-slate-800 transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          
          {isScanning ? (
            <button
              onClick={onStopScan}
              type="button"
              className="flex items-center space-x-1 px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 hover:text-rose-100 rounded-lg border border-rose-900 transition font-sans text-xs"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>توقف اسکن</span>
            </button>
          ) : (
            <button
              onClick={onStartScan}
              type="button"
              className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 rounded-lg border border-emerald-500/30 transition font-sans text-xs"
            >
              <Play className="w-3.5 h-3.5" />
              <span>شروع اسکن</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

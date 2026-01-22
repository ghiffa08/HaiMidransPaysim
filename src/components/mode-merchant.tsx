"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Copy, Share, Download, RefreshCw, Printer } from "lucide-react";

export function ModeMerchant({ onBack }: { onBack: () => void }) {
  const [nominal, setNominal] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [generated, setGenerated] = useState(false);

  const [loading, setLoading] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mode 1: Manual URL Display
    if (qrUrl) {
        setGenerated(true);
        return;
    }

    // Mode 2: Generate from Amount
    if (!nominal) return;
    
    setLoading(true);
    try {
        const res = await fetch("/api/sandbox/charge", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount: nominal.replace(/\D/g, "") })
        });
        const data = await res.json();
        
        if (res.ok && data.success) {
            setQrUrl(data.qrUrl);
            setGenerated(true);
        } else {
            alert("Error: " + (data.message || "Failed to generate QR"));
        }
    } catch (err) {
        console.error(err);
        alert("Failed to connect to server");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-in slide-in-from-right duration-500">
      {/* Header */}
      <div className="px-6 py-4 flex items-center bg-white border-b border-slate-100 shadow-sm sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={onBack} className="-ml-2 text-slate-800 hover:bg-slate-100 rounded-full">
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <div className="ml-3">
             <h2 className="text-lg font-bold text-slate-900 leading-tight">Merchant Portal</h2>
             <p className="text-xs text-slate-500">QRIS Generator</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
      {!generated ? (
        <form onSubmit={handleGenerate} className="space-y-6 mt-2">
           <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                <div className="space-y-3">
                    <Label htmlFor="nominal" className="text-slate-600 font-semibold">Payment Amount</Label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400">Rp</span>
                        <Input
                        id="nominal"
                        type="text"
                        placeholder="0"
                        value={nominal}
                        onChange={(e) => setNominal(e.target.value)}
                        className="pl-12 h-14 bg-slate-50 border-slate-200 text-slate-900 text-xl font-bold font-mono focus-visible:ring-[#118EEA] focus-visible:border-[#118EEA] rounded-xl"
                        />
                    </div>
                </div>

                <div className="space-y-3">
                    <Label htmlFor="qrUrl" className="text-slate-600 font-semibold">Or Paste Existing QR URL</Label>
                    <div className="relative">
                        <textarea
                            id="qrUrl"
                            placeholder="Paste midtrans qr image url..."
                            value={qrUrl}
                            onChange={(e) => setQrUrl(e.target.value)}
                            className="w-full h-24 p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#118EEA] resize-none leading-relaxed"
                        />
                    </div>
                    <p className="text-xs text-slate-400">
                        Leave empty if you want to generate a new QR code from amount.
                    </p>
                </div>
            </div>

          <Button type="submit" className="w-full h-14 text-lg font-bold bg-[#118EEA] hover:bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200" disabled={(!nominal && !qrUrl) || loading}>
            {loading ? "Generating..." : (qrUrl ? "Display QR Code" : "Generate QRIS Code")}
          </Button>
        </form>
      ) : (
        <div className="flex flex-col items-center justify-center h-full space-y-8 animate-in zoom-in duration-300">
          <Card className="p-8 bg-white rounded-3xl w-full max-w-[320px] aspect-square flex flex-col items-center justify-center shadow-xl shadow-slate-200 border border-slate-100 relative overflow-hidden">
            {/* QRIS Header Style */}
            <div className="absolute top-0 inset-x-0 h-16 bg-red-600 flex items-center justify-center">
                 <span className="text-white font-bold text-lg tracking-widest">QRIS</span>
            </div>
            <div className="mt-8 mb-2">
                 <QRCodeSVG value={qrUrl} size={220} />
            </div>
            <div className="flex items-center gap-1">
                 <span className="text-[10px] font-bold text-slate-900">NMID:</span>
                 <span className="text-[10px] font-mono text-slate-500">ID1234567890</span>
            </div>
          </Card>

          <div className="text-center space-y-1">
            <p className="text-sm text-slate-400 font-medium uppercase tracking-wide">Total Payment</p>
            <p className="text-3xl font-extrabold text-[#118EEA]">Rp {nominal || "0"}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
              <Button variant="outline" className="h-12 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 rounded-xl gap-2 font-semibold">
                  <Share className="w-4 h-4" /> Share
              </Button>
              <Button variant="outline" className="h-12 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 rounded-xl gap-2 font-semibold">
                  <Printer className="w-4 h-4" /> Print
              </Button>
          </div>

          <Button
            variant="ghost"
            className="text-[#118EEA] hover:bg-blue-50 gap-2"
            onClick={() => setGenerated(false)}
          >
            <RefreshCw className="w-4 h-4" /> Create New
          </Button>
        </div>
      )}
      </div>
    </div>
  );
}

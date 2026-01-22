"use client";

import { useState, useEffect } from "react";
import { LayoutShell } from "@/components/layout-shell";
import { Button } from "@/components/ui/button";
import { ModeMerchant } from "@/components/mode-merchant";
import { ModeUser } from "@/components/mode-user";
import { Onboarding } from "@/components/onboarding";
import { Scan, Plus, History, Bell, Wallet as WalletIcon, ArrowUpRight, Send, ArrowDownLeft, Grid, User, Home as HomeIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Home() {
  const [mode, setMode] = useState<"home" | "merchant" | "user">("home");
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const hasVisited = localStorage.getItem("hasVisited");
    if (!hasVisited) {
      setShowOnboarding(true);
    }
  }, []);

  const handleOnboardingComplete = () => {
      localStorage.setItem("hasVisited", "true");
      setShowOnboarding(false);
  };

  return (
    <LayoutShell className={mode !== "home" ? "p-0" : "p-0 bg-slate-50"}>
      {showOnboarding && <Onboarding onComplete={handleOnboardingComplete} />}
      
      {mode === "home" ? (
         <div className="flex flex-col h-full bg-slate-50 text-slate-900 overflow-hidden">
            {/* Top Section (Blue Background) */}
            <div className="bg-[#118EEA] pt-8 pb-16 px-6 rounded-b-[2.5rem] relative shadow-lg flex-none">
                <header className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border-2 border-white/20 bg-white/10 text-white">
                            <AvatarImage src="https://github.com/shadcn.png" />
                            <AvatarFallback>JD</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col text-white">
                            <span className="font-semibold text-sm">Hi, John Doe</span>
                            <span className="text-xs text-blue-100">Premium Member</span>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" className="rounded-full text-white hover:bg-white/10" onClick={() => setMode("merchant")}>
                        <Bell className="w-5 h-5" />
                    </Button>
                </header>

                {/* Balance & Main Actions */}
                <div className="flex flex-col gap-2 text-white mb-2">
                    <span className="text-sm font-medium text-blue-100">Active Balance</span>
                    <h1 className="text-3xl font-bold tracking-tight">
                        Rp 99.999.999
                    </h1>
                </div>
            </div>

            {/* Quick Actions Card (Floating) */}
            <div className="px-6 -mt-8 relative z-10 flex-none">
                 <div className="bg-white rounded-xl shadow-lg shadow-slate-200/50 p-4 border border-slate-100 flex justify-between items-center">
                     <QuickAction icon={Plus} label="Top Up" onClick={() => {}} />
                     <QuickAction icon={Send} label="Send" onClick={() => {}} />
                     <QuickAction icon={ArrowDownLeft} label="Request" onClick={() => {}} />
                     <QuickAction icon={History} label="History" onClick={() => {}} />
                 </div>
            </div>

            {/* Main Content Area */}
            <main className="flex-1 px-6 pt-6 space-y-6 overflow-y-auto pb-4">
                {/* Services Grid */}
                <div className="grid grid-cols-4 gap-y-6 gap-x-2">
                     <ServiceIcon icon={WalletIcon} label="Dana Kaget" color="bg-orange-100 text-orange-600" />
                     <ServiceIcon icon={Grid} label="Bills" color="bg-green-100 text-green-600" />
                     <ServiceIcon icon={ArrowUpRight} label="Cashout" color="bg-blue-100 text-blue-600" />
                     <ServiceIcon icon={User} label="Profile" color="bg-purple-100 text-purple-600" onClick={() => setMode("merchant")}/> {/* Using Profile as Merchant Entry for now */}
                </div>

                {/* Promo/Banner */}
                <div className="rounded-xl overflow-hidden bg-gradient-to-r from-blue-500 to-cyan-500 p-4 text-white shadow-md">
                    <h3 className="font-bold text-lg mb-1">Merchant Mode</h3>
                    <p className="text-sm text-blue-50 mb-3 block opacity-90">Generate QRIS for testing payments.</p>
                    <Button size="sm" variant="secondary" className="h-8 text-xs font-semibold text-blue-600 bg-white hover:bg-zinc-100" onClick={() => setMode("merchant")}>
                        Open Generator
                    </Button>
                </div>

                 {/* Recent Activity */}
                 <div>
                    <h3 className="text-base font-bold text-slate-800 mb-3">Recent Activity</h3>
                    <div className="space-y-3 pb-2">
                        {[1, 2, 3].map((_, i) => (
                             <div key={i} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
                                        <Scan className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-semibold text-sm text-slate-900">Merchant Pay</span>
                                        <span className="text-xs text-slate-400">Today, 10:00</span>
                                    </div>
                                </div>
                                <span className="font-bold text-sm text-slate-900 font-mono">- Rp 54.000</span>
                             </div>
                        ))}
                    </div>
                </div>
            </main>

            {/* Bottom Navigation */}
            <div className="h-[4.5rem] bg-white border-t border-slate-100 flex items-center justify-around px-2 z-20 pb-1 flex-none shadow-[0_-5px_10px_rgba(0,0,0,0.02)]">
                <NavButton icon={HomeIcon} label="Home" active />
                <NavButton icon={History} label="History" />
                
                {/* QRIS Button (Central) */}
                <div className="relative -top-6">
                    <Button 
                        size="icon" 
                        className="h-16 w-16 rounded-full bg-[#118EEA] hover:bg-blue-600 shadow-xl shadow-blue-500/40 border-4 border-slate-50 flex flex-col items-center justify-center p-0 transform transition-transform active:scale-95"
                        onClick={() => setMode("user")}
                    >
                        <Scan className="w-8 h-8 text-white mb-0.5" />
                    </Button>
                </div>

                <NavButton icon={WalletIcon} label="Pocket" />
                <NavButton icon={User} label="Me" />
            </div>
         </div>
      ) : mode === "merchant" ? (
        <ModeMerchant onBack={() => setMode("home")} />
      ) : (
        <ModeUser onBack={() => setMode("home")} />
      )}
    </LayoutShell>
  );
}

function QuickAction({ icon: Icon, label, onClick }: { icon: any, label: string, onClick: () => void }) {
    return (
        <div className="flex flex-col items-center gap-2 cursor-pointer active:scale-95 transition-transform" onClick={onClick}>
            <div className="h-10 w-10 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center text-[#118EEA]">
                <Icon className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium text-slate-600">{label}</span>
        </div>
    )
}

function ServiceIcon({ icon: Icon, label, color, onClick }: { icon: any, label: string, color: string, onClick?: () => void }) {
    return (
        <div className="flex flex-col items-center gap-2 cursor-pointer active:scale-95 transition-transform" onClick={onClick}>
            <div className={`h-12 w-12 rounded-2xl ${color} flex items-center justify-center mb-1`}>
                <Icon className="w-6 h-6" />
            </div>
            <span className="text-xs font-medium text-slate-700 text-center leading-tight w-16">{label}</span>
        </div>
    )
}

function NavButton({ icon: Icon, label, active }: { icon: any, label: string, active?: boolean }) {
    return (
        <div className={`flex flex-col items-center gap-1 p-2 w-14 cursor-pointer ${active ? 'text-[#118EEA]' : 'text-slate-400'}`}>
            <Icon className={`w-6 h-6 ${active ? 'fill-current' : ''}`} />
            <span className="text-[10px] font-medium">{label}</span>
        </div>
    )
}

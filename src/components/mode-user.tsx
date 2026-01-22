"use client";

import { useEffect, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle, Flashlight, Loader2, ScanLine, X, Zap } from "lucide-react";
import { toast } from "sonner";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";

// Payment Drawer Component
function PaymentDrawer({ 
    open, 
    onOpenChange, 
    qrUrl, 
    onSuccess 
}: { 
    open: boolean; 
    onOpenChange: (open: boolean) => void; 
    qrUrl: string | null;
    onSuccess: () => void;
}) {
    const [loading, setLoading] = useState(false);

    const handlePay = async () => {
        setLoading(true);
        try {
             // In a real app we would parse the qrUrl to get ID/Amount
             // For sandbox simulation we just pass it through
             const response = await fetch("/api/sandbox/pay", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ qrCodeUrl: qrUrl }),
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.message || "Payment Failed");

            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
             toast.error(error.message || "Payment Failed");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent className="bg-white border-none text-slate-900">
                <DrawerHeader className="text-left border-b border-slate-100 pb-4">
                    <div className="flex justify-center mb-4">
                        <div className="h-1.5 w-12 bg-slate-200 rounded-full" />
                    </div>
                    <DrawerTitle className="text-lg font-extrabold flex items-center gap-2 text-slate-900">
                         Payment Confirmation
                    </DrawerTitle>
                    <DrawerDescription className="text-slate-500">
                        Midtrans Sandbox Transaction
                    </DrawerDescription>
                </DrawerHeader>
                <div className="p-6 space-y-6">
                     <div className="flex flex-col items-center justify-center p-6 bg-[#118EEA]/5 rounded-2xl border border-[#118EEA]/10">
                         <span className="text-slate-500 text-sm font-medium">Total Amount</span>
                         <span className="text-3xl font-extrabold text-[#118EEA] mt-1">Rp 15.000</span>
                     </div>

                     <div className="space-y-4">
                         <div className="flex justify-between items-center text-sm">
                             <span className="text-slate-500">Merchant</span>
                             <span className="font-bold text-slate-900">Midtrans Merchant</span>
                         </div>
                         <div className="flex justify-between items-center text-sm">
                             <span className="text-slate-500">Ref ID</span>
                             <span className="font-mono text-xs text-slate-400 font-medium bg-slate-100 px-2 py-1 rounded">ORD-1234-MOCK</span>
                         </div>
                     </div>
                </div>
                <DrawerFooter className="px-6 pb-8">
                    <Button onClick={handlePay} disabled={loading} size="lg" className="h-14 bg-[#118EEA] hover:bg-blue-600 text-white font-bold rounded-2xl text-lg relative shadow-lg shadow-blue-200">
                        {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin absolute left-4" />}
                        PAY NOW
                    </Button>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    )
}

export function ModeUser({ onBack }: { onBack: () => void }) {
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [success, setSuccess] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    if (drawerOpen || success) return;

    const scannerId = "reader";
    // Ensure element exists before initializing
    const element = document.getElementById(scannerId);
    if (!element) return;

    const html5QrCode = new Html5Qrcode(scannerId);
    
    const startScanner = async () => {
        try {
            await html5QrCode.start(
                { facingMode: "environment" },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0
                },
                (decodedText) => {
                    console.log("Scanned:", decodedText);
                    setScanResult(decodedText);
                    setDrawerOpen(true);
                    
                    // Stop scanning on success to save resources/battery
                    html5QrCode.stop().catch(console.error);
                },
                (errorMessage) => {
                   // Parse errors are common and can be ignored
                }
            );
        } catch (err: any) {
            console.error("Camera failed to start", err);
            setCameraError(err?.message || "Camera permission denied or unavailable");
        }
    };

    startScanner();

    // Cleanup function
    return () => {
       if (html5QrCode.isScanning) {
           html5QrCode.stop().then(() => html5QrCode.clear()).catch(console.error);
       } else {
           html5QrCode.clear();
       }
    };
  }, [drawerOpen, success]);

  const handleSuccess = () => { setSuccess(true); toast.success("Payment Verified"); }

  if (success) {
      return (
          <div className="flex flex-col items-center justify-center h-full bg-white text-slate-900 animate-in zoom-in duration-300 relative overflow-hidden">
               <div className="relative z-10 flex flex-col items-center w-full px-6">
                   <div className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center shadow-2xl shadow-green-200 mb-8 animate-bounce">
                        <CheckCircle className="w-12 h-12 text-white" />
                   </div>
                   <h2 className="text-2xl font-bold mb-2 text-slate-900">Payment Successful!</h2>
                   <p className="text-slate-500">Your transaction has been processed.</p>
                   
                   <div className="mt-8 w-full bg-slate-50 border border-slate-100 rounded-2xl p-6 space-y-4 relative">
                       <div className="flex justify-between items-center pb-4 border-b border-slate-200 border-dashed">
                           <span className="text-slate-500 text-sm">Amount</span>
                           <span className="font-bold text-lg">Rp 15.000</span>
                       </div>
                       <div className="flex justify-between items-center">
                           <span className="text-slate-500 text-sm">Merchant</span>
                           <span className="font-medium text-sm">Midtrans Sandbox</span>
                       </div>
                       <div className="flex justify-between items-center">
                           <span className="text-slate-500 text-sm">Date</span>
                           <span className="font-medium text-sm">{new Date().toLocaleString()}</span>
                       </div>
                   </div>

                   <Button onClick={onBack} size="lg" className="w-full h-14 mt-8 rounded-2xl bg-[#118EEA] text-white font-bold hover:bg-blue-600 shadow-lg shadow-blue-200">
                       Done
                   </Button>
               </div>
          </div>
      )
  }

  return (
    <div className="relative h-full bg-black">
      <PaymentDrawer open={drawerOpen} onOpenChange={(open) => { setDrawerOpen(open); if(!open) setScanResult(null); }} qrUrl={scanResult} onSuccess={handleSuccess} />
      
      {/* Container for the scanner - Critical Fix: Removed `hidden` children hacks */}
      <div id="reader" className="w-full h-full overflow-hidden [&>video]:object-cover [&>video]:w-full [&>video]:h-full" />

      {cameraError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20 p-6 text-center">
              <div className="space-y-4">
                  <p className="text-red-400 font-semibold">Camera Error</p>
                  <p className="text-white text-sm">{cameraError}</p>
                  <Button variant="secondary" onClick={onBack}>Go Back</Button>
              </div>
          </div>
      )}

      {/* Modern QRIS Overlay */}
      <div className="absolute inset-0 z-10 flex flex-col justify-between pointer-events-none p-6 pb-24">
           {/* Top Bar */}
           <div className="flex justify-between pointer-events-auto mt-4">
               <Button size="icon" variant="ghost" className="rounded-full bg-black/30 backdrop-blur text-white hover:bg-black/50" onClick={onBack}>
                    <X className="w-6 h-6" />
               </Button>
               <Button size="icon" variant="ghost" className="rounded-full bg-black/30 backdrop-blur text-white hover:bg-black/50">
                    <Zap className="w-6 h-6" />
               </Button>
           </div>

           {/* Central Frame */}
           <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
               <div className="w-72 h-72 rounded-3xl relative border border-white/20">
                    <div className="absolute inset-0 border-[3px] border-white/30 rounded-3xl" />
                    
                    <div className="absolute top-0 left-0 w-8 h-8 border-l-4 border-t-4 border-white -ml-0.5 -mt-0.5 rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-r-4 border-t-4 border-white -mr-0.5 -mt-0.5 rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-l-4 border-b-4 border-white -ml-0.5 -mb-0.5 rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-r-4 border-b-4 border-white -mr-0.5 -mb-0.5 rounded-br-lg" />

                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 px-3 py-1 rounded text-[10px] font-bold tracking-widest text-[#ED1C24]">
                        QRIS
                    </div>
               </div>
           </div>

           {/* Bottom Hint */}
           <div className="text-center space-y-1 pointer-events-auto">
               <p className="font-semibold text-white text-lg drop-shadow-md">Scan QRIS to Pay</p>
               <p className="text-sm text-white/80">Support all QRIS payments</p>
           </div>
      </div>
    </div>
  );
}

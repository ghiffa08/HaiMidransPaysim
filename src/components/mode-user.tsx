"use client";

import { useEffect, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle, Flashlight, Loader2, ScanLine, X, Zap, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

// Payment Drawer Component (Existing)
function PaymentDrawer({ 
    open, 
    onOpenChange, 
    details,
    paymentContext,
    onSuccess 
}: { 
    open: boolean; 
    onOpenChange: (open: boolean) => void; 
    details: { amount: string, merchant: string } | null;
    paymentContext: any;
    onSuccess: () => void;
}) {
    const [loading, setLoading] = useState(false);

    // Handle Payment (Existing Flow for QRIS - uses scannedUrl)
    const handlePayment = async () => {
        if (!details) return; 
        
        setLoading(true);
        try {
            const qrUrl = paymentContext?.qrUrl || paymentContext?.originalUrl; 
            
            // Backward compatible request (API now handles 'scannedUrl' and defaults to QRIS)
            const response = await fetch("/api/sandbox/pay", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ scannedUrl: qrUrl, type: 'qris' })
            });
            
            const data = await response.json();
            
            if (data.success) {
                onSuccess();
                onOpenChange(false);
            } else {
                throw new Error(data.message || "Payment Failed");
            }
        } catch (error: any) {
            toast.error(error.message || "Payment Error");
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
                         <span className="text-3xl font-extrabold text-[#118EEA] mt-1">{details?.amount || "Rp 0"}</span>
                     </div>

                     <div className="space-y-4">
                         <div className="flex justify-between items-center text-sm">
                             <span className="text-slate-500">Merchant</span>
                             <span className="font-bold text-slate-900 line-clamp-1">{details?.merchant || "Unknown"}</span>
                         </div>
                         <div className="flex justify-between items-center text-sm">
                             <span className="text-slate-500">Ref ID</span>
                             <span className="font-mono text-xs text-slate-400 font-medium bg-slate-100 px-2 py-1 rounded">ORD-{Math.floor(Math.random() * 10000)}</span>
                         </div>
                     </div>
                </div>
                <DrawerFooter className="px-6 pb-8">
                    <Button onClick={handlePayment} disabled={loading} size="lg" className="h-14 bg-[#118EEA] hover:bg-blue-600 text-white font-bold rounded-2xl text-lg relative shadow-lg shadow-blue-200">
                        {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin absolute left-4" />}
                        PAY NOW
                    </Button>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    )
}

export function ModeUser({ onBack }: { onBack: () => void }) {
  const [activeTab, setActiveTab] = useState("scan");
  
  // Scanner State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [success, setSuccess] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<{amount: string, merchant: string} | null>(null);
  const [paymentContext, setPaymentContext] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Manual VA State
  const [selectedBank, setSelectedBank] = useState("bca");
  const [vaNumber, setVaNumber] = useState("");
  const [manualLoading, setManualLoading] = useState(false);

  // --- LOGIC PEMBAYARAN UNIVERSAL (Manual VA) ---
  const handleManualPay = async () => {
      setManualLoading(true);
      try {
          const res = await fetch("/api/sandbox/pay", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                  type: 'va', 
                  number: vaNumber, 
                  bank: selectedBank 
              })
          });

          const result = await res.json();
          if (res.ok && result.success) {
              setSuccess(true);
              toast.success("Pembayaran Berhasil!");
          } else {
              toast.error(result.message || "Gagal Membayar");
          }
      } catch (e) {
          toast.error("Terjadi kesalahan sistem");
      } finally {
          setManualLoading(false);
      }
  };

  // --- SCANNER EFFECT ---
  useEffect(() => {
    // Stop scanner if: Drawer Open OR Success OR Processing OR NOT IN SCAN TAB
    if (drawerOpen || success || isProcessing || activeTab !== 'scan') {
        const scannerId = "reader";
        // Attempt clean up if logic allows, but Html5Qrcode requires instance handling.
        // Simplified: We rely on the generic cleanup below to stop it when dependencies change.
        return;
    }

    const scannerId = "reader";
    const element = document.getElementById(scannerId);
    if (!element) return;

    const html5QrCode = new Html5Qrcode(scannerId);
    
    const startScanner = async () => {
        try {
            if (typeof window !== "undefined" && window.isSecureContext === false) {
                 throw new Error("Camera requires HTTPS or Localhost.");
            }

            // Small delay to ensure tab render
            await new Promise(r => setTimeout(r, 100));

            await html5QrCode.start(
                { facingMode: "environment" },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0
                },
                async (decodedText) => {
                    await html5QrCode.stop();
                    setIsProcessing(true);
                    toast.loading("Verifying QR...", { id: "inquiry" });

                    try {
                        const response = await fetch("/api/sandbox/inquiry", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ qrUrl: decodedText }),
                        });
                        const res = await response.json();

                        if (!response.ok) throw new Error(res.message || "Invalid QR");

                        toast.dismiss("inquiry");
                        setPaymentDetails({ amount: res.data.amount, merchant: res.data.merchantName });
                        setPaymentContext(res.data.context);
                        setDrawerOpen(true);
                    } catch (err: any) {
                         toast.error(err.message || "Failed to read QR", { id: "inquiry" });
                         setCameraError("Failed to verify QR Code. Please try again.");
                    } finally {
                        setIsProcessing(false);
                    }
                },
                (errorMessage) => {}
            );
        } catch (err: any) {
            console.error("Camera failed to start", err);
            setCameraError(err?.message || "Camera unavailable");
        }
    };

    startScanner();

    return () => {
       if (html5QrCode.isScanning) {
           html5QrCode.stop().then(() => html5QrCode.clear()).catch(console.error);
       } else {
           html5QrCode.clear();
       }
    };
  }, [drawerOpen, success, isProcessing, activeTab]);

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
                       {/* Show details only if available (QRIS), else generic */}
                       {paymentDetails ? (
                           <>
                                <div className="flex justify-between items-center pb-4 border-b border-slate-200 border-dashed">
                                    <span className="text-slate-500 text-sm">Amount</span>
                                    <span className="font-bold text-lg">{paymentDetails.amount}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500 text-sm">Merchant</span>
                                    <span className="font-medium text-sm">{paymentDetails.merchant}</span>
                                </div>
                           </>
                       ) : (
                            <div className="text-center text-sm text-slate-500">
                                Virtual Account Payment Processed
                            </div>
                       )}
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
    <div className="h-full bg-slate-950 text-white flex flex-col">
      {/* Header */}
      <div className="p-4 flex items-center justify-between bg-slate-900 border-b border-slate-800 shrink-0 z-20">
          <Button variant="ghost" onClick={onBack} size="sm" className="text-slate-400 hover:text-white">
              <ArrowLeft className="w-5 h-5 mr-1" /> Back
          </Button>
          <span className="font-bold">Simulator Bayar</span>
          <div className="w-10"></div>
      </div>

      <Tabs defaultValue="scan" className="flex-1 flex flex-col" value={activeTab} onValueChange={setActiveTab}>
        <div className="px-6 pt-4 shrink-0 bg-slate-950">
            <TabsList className="grid w-full grid-cols-2 bg-slate-900">
                <TabsTrigger value="scan">Scan QRIS</TabsTrigger>
                <TabsTrigger value="manual">Input VA</TabsTrigger>
            </TabsList>
        </div>

        {/* TAB 1: SCANNER */}
        <TabsContent value="scan" className="flex-1 relative mt-4 mx-4 mb-4 rounded-xl overflow-hidden bg-black ring-1 ring-slate-800">
             
            <PaymentDrawer 
                open={drawerOpen} 
                onOpenChange={(open) => { setDrawerOpen(open); }} 
                details={paymentDetails}
                paymentContext={paymentContext}
                onSuccess={handleSuccess} 
            />
            
            <div id="reader" className="w-full h-full overflow-hidden [&>video]:object-cover [&>video]:w-full [&>video]:h-full" />

            {(cameraError || isProcessing) && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20 p-6 text-center">
                    <div className="space-y-4">
                        {isProcessing ? (
                            <div className="flex flex-col items-center">
                                <Loader2 className="w-10 h-10 text-white animate-spin mb-4" />
                                <p className="text-white font-semibold">Verifying QR Code...</p>
                            </div>
                        ) : (
                            <>
                                <p className="text-red-400 font-semibold">Scanner Error</p>
                                <p className="text-white text-sm">{cameraError}</p>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* QRIS Overlay */}
            {!cameraError && !isProcessing && (
                <div className="absolute inset-0 z-10 flex flex-col justify-between pointer-events-none p-6 pb-24">
                    <div className="flex justify-end pointer-events-auto mt-4">
                        <Button size="icon" variant="ghost" className="rounded-full bg-black/30 backdrop-blur text-white hover:bg-black/50">
                            <Zap className="w-6 h-6" />
                        </Button>
                    </div>

                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-64 h-64 rounded-3xl relative border border-white/20">
                            <div className="absolute inset-0 border-[3px] border-white/30 rounded-3xl" />
                            <div className="absolute top-0 left-0 w-8 h-8 border-l-4 border-t-4 border-white -ml-0.5 -mt-0.5 rounded-tl-lg" />
                            <div className="absolute top-0 right-0 w-8 h-8 border-r-4 border-t-4 border-white -mr-0.5 -mt-0.5 rounded-tr-lg" />
                            <div className="absolute bottom-0 left-0 w-8 h-8 border-l-4 border-b-4 border-white -ml-0.5 -mb-0.5 rounded-bl-lg" />
                            <div className="absolute bottom-0 right-0 w-8 h-8 border-r-4 border-b-4 border-white -mr-0.5 -mb-0.5 rounded-br-lg" />
                        </div>
                    </div>

                     <div className="text-center space-y-1 pointer-events-auto">
                        <p className="font-semibold text-white text-lg drop-shadow-md">Scan QRIS to Pay</p>
                    </div>
                </div>
            )}
        </TabsContent>

        {/* TAB 2: MANUAL INPUT (VA) */}
        <TabsContent value="manual" className="flex-1 p-6 space-y-6 mt-0">
            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Pilih Bank</label>
                    <Select value={selectedBank} onValueChange={setSelectedBank}>
                        <SelectTrigger className="bg-slate-900 border-slate-700 text-white h-12">
                            <SelectValue placeholder="Pilih Bank" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                            <SelectItem value="bca">BCA Virtual Account</SelectItem>
                            <SelectItem value="bni">BNI Virtual Account</SelectItem>
                            <SelectItem value="bri">BRI Virtual Account</SelectItem>
                            <SelectItem value="permata">Permata Virtual Account</SelectItem>
                            <SelectItem value="cimb">CIMB Niaga VA</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Nomor Virtual Account</label>
                    <Input 
                        placeholder="Contoh: 700012345678" 
                        className="bg-slate-900 border-slate-700 text-white text-lg h-12 placeholder:text-slate-600"
                        value={vaNumber}
                        onChange={(e) => setVaNumber(e.target.value)}
                    />
                    <p className="text-xs text-slate-500">
                        Masukkan nomor VA yang Anda dapatkan dari halaman Checkout.
                    </p>
                </div>
            </div>

            <Button 
                size="lg" 
                className="w-full bg-[#118EEA] hover:bg-blue-600 font-bold h-12 text-lg mt-4"
                disabled={manualLoading || !vaNumber}
                onClick={handleManualPay}
            >
                {manualLoading ? <Loader2 className="animate-spin mr-2" /> : <CreditCard className="mr-2 w-5 h-5" />}
                Bayar Sekarang
            </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}

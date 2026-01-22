"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, CreditCard, ScanLine, Smartphone, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      icon: CreditCard,
      title: "Midtrans Ecosystem",
      description: "Experience the power of Midtrans Sandbox. Test payments safely without using real money.",
      color: "bg-blue-100 text-blue-600",
    },
    {
      icon: ScanLine,
      title: "QRIS Simulator",
      description: "One app to Rule them all. Generate Sandbox QR codes and Scan them to simulate real-world transactions.",
      color: "bg-emerald-100 text-emerald-600",
    },
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="absolute inset-0 z-50 bg-white flex flex-col animate-in fade-in duration-500">
      {/* Skip Button */}
      <div className="p-6 flex justify-end">
         <Button variant="ghost" onClick={onComplete} className="text-slate-400 hover:text-slate-600">
             Skip
         </Button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-8">
          <div className="relative">
              {/* Animated Background Blob */}
              <div className={cn(
                  "absolute inset-0 rounded-full blur-3xl opacity-50 transition-colors duration-500",
                  step === 0 ? "bg-blue-200" : "bg-emerald-200"
              )} />
              
              {/* Icon Card */}
              <div className={cn(
                  "relative w-32 h-32 rounded-[2rem] flex items-center justify-center shadow-xl transition-colors duration-500",
                  steps[step].color
              )}>
                  <IconComponent icon={steps[step].icon} />
              </div>
          </div>

          <div className="space-y-4 max-w-xs mx-auto">
              <h2 className="text-2xl font-bold text-slate-900 leading-tight">
                  {steps[step].title}
              </h2>
              <p className="text-slate-500 leading-relaxed">
                  {steps[step].description}
              </p>
          </div>
      </div>

      {/* Footer / Controls */}
      <div className="p-8 space-y-8">
          {/* Indicators */}
          <div className="flex justify-center gap-2">
              {steps.map((_, i) => (
                  <div 
                    key={i} 
                    className={cn(
                        "h-2 rounded-full transition-all duration-300",
                        i === step ? "w-8 bg-[#118EEA]" : "w-2 bg-slate-200"
                    )} 
                  />
              ))}
          </div>

          <Button 
            onClick={handleNext} 
            size="lg" 
            className="w-full h-14 rounded-2xl text-lg font-bold bg-[#118EEA] hover:bg-blue-600 shadow-lg shadow-blue-200"
          >
            {step === steps.length - 1 ? "Get Started" : "Next"}
          </Button>
      </div>
    </div>
  );
}

function IconComponent({ icon: Icon }: { icon: any }) {
    return <Icon className="w-12 h-12" />
}

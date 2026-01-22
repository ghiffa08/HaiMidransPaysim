import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { qrCodeUrl } = await req.json();

    if (!qrCodeUrl) {
      return NextResponse.json(
        { message: "QR Code URL is required" },
        { status: 400 }
      );
    }
    
    // We are proxying to Midtrans Simulator
    // The simulator expects a POST to /qris/payment with body { qrCodeUrl: string }
    // It requires Origin and Referer to be set to the simulator domain.

    const targetUrl = "https://simulator.sandbox.midtrans.com/qris/payment";
    
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Origin": "https://simulator.sandbox.midtrans.com",
        "Referer": "https://simulator.sandbox.midtrans.com/qris/payment",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      body: JSON.stringify({ qrCodeUrl }),
    });

    const data = await response.json().catch(() => ({}));
    
    if (!response.ok) {
        // Log error for debugging but return clean message
        console.error("Midtrans Proxy Error:", response.status, data);
        return NextResponse.json(
            { message: data.message || "Upstream Payment Failed" },
            { status: response.status }
        );
    }

    return NextResponse.json(data);

  } catch (error: any) {
    console.error("Internal Proxy Error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

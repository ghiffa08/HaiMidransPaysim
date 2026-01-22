import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { actionUrl, formData } = body;

    if (!actionUrl || !formData) {
        // Fallback for older clients or direct calls (simulate legacy behavior if needed, or just error)
        return NextResponse.json(
            { message: "Invalid payment context. Please scan again." },
            { status: 400 }
        );
    }
    
    // Construct Form Data
    const params = new URLSearchParams();
    for (const key in formData) {
        params.append(key, formData[key]);
    }

    // Submit Request (Mimic Browser Form Submit)
    const response = await fetch(actionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Origin": new URL(actionUrl).origin,
        "Referer": actionUrl, // Usually the referer is the form page (which is the actionUrl or the original URL, but actionUrl is safe)
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      body: params,
      redirect: "manual" // We want to see if it redirects (success)
    });

    // Check success
    // Usually a 302 redirect means success in these flows
    if (response.status === 302 || response.status === 200) {
         return NextResponse.json({ success: true, message: "Payment Successful" });
    }

    // If we get here, it might be an error page
    const text = await response.text();
    console.error("Upstream Payment Error:", response.status, text.slice(0, 500));
    
    return NextResponse.json(
        { message: "Upstream declined the payment." },
        { status: response.status }
    );

  } catch (error: any) {
    console.error("Internal Proxy Error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

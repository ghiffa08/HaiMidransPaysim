import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Support both naming conventions for flexibility
    const scannedUrl = body.scannedUrl || body.qrCodeUrl || body.qrUrl;

    if (!scannedUrl) {
        return NextResponse.json(
            { message: "QR URL (scannedUrl) is required." },
            { status: 400 }
        );
    }
    
    // 1. Fetch Fresh Session (Cookies & CSRF Token)
    // We do this immediately before payment to ensure the token is fresh and valid.
    const simulatorUrl = "https://simulator.sandbox.midtrans.com/qris/payment";
    
    let cookies = "";
    let csrfToken = "";
    
    try {
        const sessionRes = await fetch(simulatorUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8"
            },
            cache: "no-store"
        });
        
        // Extract Cookies
        // @ts-ignore
        if (typeof sessionRes.headers.getSetCookie === 'function') {
            // @ts-ignore
            cookies = sessionRes.headers.getSetCookie().join("; ");
        } else {
            cookies = sessionRes.headers.get("set-cookie") || "";
        }

        // Extract CSRF Token
        const html = await sessionRes.text();
        const csrfMatch = html.match(/<meta[^>]*name="csrf-token"[^>]*content="([^"]+)"/i);
        csrfToken = csrfMatch ? csrfMatch[1] : "";
        
        if (!csrfToken) {
            console.error("Failed to fetch CSRF Token from Simulator");
            // We might try to proceed without it, but it will likely fail. 
            // Let's proceed and see if the simulator accepts it or if we can extract it from input fields.
            const inputTokenMatch = html.match(/<input[^>]*name="_token"[^>]*value="([^"]+)"/i);
            if (inputTokenMatch) csrfToken = inputTokenMatch[1];
        }

    } catch (sessionErr) {
        console.error("Failed to fetch simulator session:", sessionErr);
        return NextResponse.json({ message: "Failed to connect to Midtrans Simulator" }, { status: 502 });
    }

    // 2. Prepare Payload
    const params = new URLSearchParams();
    params.append("qrCodeUrl", scannedUrl);
    if (csrfToken) {
        params.append("_token", csrfToken);
    }

    // 3. Submit Payment (Reverse Proxy)
    const response = await fetch(simulatorUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Origin": new URL(simulatorUrl).origin,
        "Referer": simulatorUrl, 
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Cookie": cookies
      },
      body: params,
      redirect: "manual" // We explicitly handle redirects
    });

    // 4. Validate Response
    // Midtrans Simulator redirects (302) to the merchant site on success.
    if (response.status >= 300 && response.status < 400) {
         return NextResponse.json({ success: true, message: "Payment Successful" });
    }

    const text = await response.text();

    // Soft Success Check (in case it returns 200 with success message)
    if (response.status === 200) {
        const isSuccessPage = text.includes("Payment Successful") || text.includes("Transaksi Berhasil");
        const hasError = text.includes("alert-danger") || text.includes("is invalid") || text.includes("tidak valid");
        
        if (isSuccessPage && !hasError) {
             return NextResponse.json({ success: true, message: "Payment Successful" });
        }
        
        // Failure Case (200 OK but showing form with error)
        console.error("Upstream Payment Failed (200 OK w/ Error):", text.slice(0, 500));
        return NextResponse.json(
            { message: "Payment Invalid or Expired (Upstream Rejected)" },
            { status: 400 }
        );
    }
    
    // Other Errors
    console.error(`Upstream Error ${response.status}:`, text.slice(0, 500));
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

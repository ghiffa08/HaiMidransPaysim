import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { qrUrl } = await req.json();

    if (!qrUrl) {
      return NextResponse.json({ message: "QR URL required" }, { status: 400 });
    }

    // STEP 1: Initialize Session (GET the form page)
    // We need 'set-cookie' and the CSRF token.
    const initialResponse = await fetch("https://simulator.sandbox.midtrans.com/qris/payment", {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    if (!initialResponse.ok) {
        throw new Error("Failed to reach simulator");
    }

    const initialHtml = await initialResponse.text();
    const cookies = initialResponse.headers.get("set-cookie") || "";

    // Parse CSRF Token
    const csrfMatch = initialHtml.match(/<meta[^>]*name="csrf-token"[^>]*content="([^"]+)"/i);
    const token = csrfMatch ? csrfMatch[1] : "";
    
    // STEP 2: INQUIRE (Submit the QR String to the Simulator)
    // The simulator expects:
    // POST /qris/payment
    // body: qrCodeUrl=..., _token=...
    // cookies: [session_cookies]
    
    // Check if the form action is different (usually it posts to itself)
    // We can assume it posts to the same URL for "Check"
    const simulatorUrl = "https://simulator.sandbox.midtrans.com/qris/payment";

    const params = new URLSearchParams();
    params.append("qrCodeUrl", qrUrl);
    params.append("_token", token);

    const inquiryResponse = await fetch(simulatorUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Origin": "https://simulator.sandbox.midtrans.com",
            "Referer": "https://simulator.sandbox.midtrans.com/qris/payment",
            "Cookie": cookies // IMPORTANT: Pass the session
        },
        body: params,
        redirect: "manual" // Don't follow yet, we want to parse the result page or handling redirections manually if needed
    });

    // Strategy:
    // If successful inquiry, it usually re-renders the page with the details (Status 200).
    // Or it might redirect.
    // Let's get the HTML and scrape.
    const inquiryHtml = await inquiryResponse.text();
    
    // Capture any NEW cookies (session rotation?) - merge with old ones if needed, or usually just use the latest Set-Cookie if provided.
    // For simplicity, usually strict Laravel apps respond with Set-Cookie on every request or we reuse the initial one.
    // Let's reuse 'cookies' unless inquiryResponse sets new ones.
    const newCookies = inquiryResponse.headers.get("set-cookie") || cookies; 

    // STEP 3: Scrape Amount and Merchant from the Inquiry Result
    // Look for the "Pay" confirmation details.
    
    // Regex for Amount (Format often: "Rp 10.000,00" or similar)
    // We look for the "Total Payment" or "Amount" label's value.
    const amountMatch = inquiryHtml.match(/Rp\s*([\d\.,]+)/);
    const amount = amountMatch ? `Rp ${amountMatch[1]}` : "Rp -";

    // Regex for Merchant
    // Often in a header <h3 class="...">Merchant Name</h3> or similar
    // Fallback: Use the logic we had before
    const merchantMatch = inquiryHtml.match(/<div[^>]*class="[^"]*merchant-name[^"]*"[^>]*>(.*?)<\/div>/i) || 
                          inquiryHtml.match(/<h1[^>]*>(.*?)<\/h1>/i) ||
                          inquiryHtml.match(/<strong[^>]*>(.*?)<\/strong>/i);
    const merchantName = merchantMatch ? merchantMatch[1].trim().replace(/<[^>]*>/g, "") : "Unknown Merchant";

    // STEP 4: Prepare the "CONFIRM" context
    // We need to find the form on THIS page (the inquiry result page) to submit the final payment.
    // It likely has a "Pay" button inside a form.
    // We need to extract ALL hidden inputs from this page, as they likely contain the `transaction_id` or signed params.
    
    const hiddenInputs: Record<string, string> = {};
    const inputRegex = /<input[^>]*type="hidden"[^>]*name="([^"]+)"[^>]*value="([^"]+)"/gi;
    let match;
    while ((match = inputRegex.exec(inquiryHtml)) !== null) {
        hiddenInputs[match[1]] = match[2];
    }
    
    // Also Refresh CSRF if it changed (likely did)
    const newCsrfMatch = inquiryHtml.match(/<meta[^>]*name="csrf-token"[^>]*content="([^"]+)"/i);
    if (newCsrfMatch) {
        hiddenInputs["_token"] = newCsrfMatch[1];
    } else if (!hiddenInputs["_token"]) {
        hiddenInputs["_token"] = token; // Fallback to old token if not found (unlikely)
    }

    // Check if we actually found a valid payment form.
    // If the HTML contains "alert-danger" or error messages, we should return failure.
    if (inquiryHtml.includes("alert-danger") || inquiryHtml.includes("is invalid")) {
         return NextResponse.json({
             success: false,
             message: "Invalid QR Code or Expired (Simulator Rejected)"
         }, { status: 400 });
    }

    return NextResponse.json({
        success: true,
        data: {
            amount: amount,
            merchantName: merchantName,
            context: {
                actionUrl: simulatorUrl, // Submit to the same URL usually
                formData: hiddenInputs,
                cookies: newCookies, // Pass the session for the final step
                originalUrl: qrUrl
            }
        }
    });

  } catch (error: any) {
    console.error("Inquiry Error:", error);
    return NextResponse.json({ message: error.message || "Failed to parse QR" }, { status: 500 });
  }
}

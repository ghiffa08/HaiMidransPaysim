import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { qrUrl } = await req.json();

    if (!qrUrl) {
      return NextResponse.json({ message: "QR URL required" }, { status: 400 });
    }
    
    // --- Helper: Fetch Simulator Session ---
    const fetchSession = async () => {
        try {
            const res = await fetch("https://simulator.sandbox.midtrans.com/qris/payment", {
                method: "GET",
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8"
                }
            });
            if (!res.ok) throw new Error("Simulator Unreachable: " + res.status);
            const html = await res.text();
            const cookies = res.headers.get("set-cookie") || "";
            const csrfMatch = html.match(/<meta[^>]*name="csrf-token"[^>]*content="([^"]+)"/i);
            const token = csrfMatch ? csrfMatch[1] : "";
            const actionMatch = html.match(/<form[^>]*action="([^"]+)"/i);
            const actionUrl = actionMatch ? actionMatch[1] : "https://simulator.sandbox.midtrans.com/qris/payment";
            
            return { cookies, token, actionUrl, success: true };
        } catch (e) {
            console.error("Session Fetch Error:", e);
            return { cookies: "", token: "", actionUrl: "https://simulator.sandbox.midtrans.com/qris/payment", success: false };
        }
    };

    // --- Strategy: Parallel Fetch ---
    // 1. Get Session (for payment context)
    // 2. Get QR Content (for display details)
    
    // Check if it's a URL
    const isUrl = qrUrl.startsWith("http://") || qrUrl.startsWith("https://");
    
    // Start Session Fetch immediately
    const sessionPromise = fetchSession();

    let amount = "Rp -";
    let merchantName = "Unknown Merchant";
    let hiddenInputs: Record<string, string> = { qrCodeUrl: qrUrl };

    if (isUrl) {
         // Fetch QR Content (Legacy Reliable Method)
         try {
             const qrRes = await fetch(qrUrl, {
                 headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) width=device-width" }
             });
             if (qrRes.ok) {
                 const html = await qrRes.text();
                 
                 // Create Amount
                 const amountMatch = html.match(/Rp\s*([\d\.,]+)/);
                 if (amountMatch) amount = `Rp ${amountMatch[1]}`;
                 
                 // Merchant
                 const merchantMatch = html.match(/<div[^>]*class="[^"]*merchant-name[^"]*"[^>]*>(.*?)<\/div>/i) || 
                                      html.match(/<h1[^>]*>(.*?)<\/h1>/i) ||
                                      html.match(/<strong[^>]*>(.*?)<\/strong>/i);
                 if (merchantMatch) merchantName = merchantMatch[1].trim().replace(/<[^>]*>/g, "");

                 // Inputs
                 const inputRegex = /<input[^>]*type="hidden"[^>]*name="([^"]+)"[^>]*value="([^"]+)"/gi;
                 let match;
                 while ((match = inputRegex.exec(html)) !== null) {
                    hiddenInputs[match[1]] = match[2];
                 }
             }
         } catch (e) {
             console.error("QR Content Fetch Error:", e);
         }
    } else {
         // RAW EMVCo
         try {
            const emvData = parseEmvco(qrUrl);
            merchantName = emvData["59"] || "Unknown Merchant";
            const amt = emvData["54"] || "0";
            amount = `Rp ${amt}`;
         } catch (e) { merchantName = "Raw QR Code"; }
    }

    // Await Session
    const session = await sessionPromise;
    
    // Merge Context
    if (session.success) {
        if (session.token) hiddenInputs["_token"] = session.token;
        // If we didn't find hidden inputs from QR URL (or it was raw), we rely on the session inputs? 
        // Actually, for Raw/Simulator flow, we usually just need qrCodeUrl + _token.
        // But for "Snap" links, there might be other hidden fields.
        // We preserve 'hiddenInputs' gathered from QR URL as they are specific to the transaction!
        // We ONLY start session to get cookies and CSRF.
    }

    return NextResponse.json({
        success: true,
        data: {
            amount,
            merchantName,
            context: {
                actionUrl: session.actionUrl, 
                formData: hiddenInputs,
                cookies: session.cookies,
                originalUrl: qrUrl
            }
        }
    });

  } catch (error: any) {
    console.error("Inquiry Critical Error:", error);
    return NextResponse.json({ message: error.message || "System Error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";

function parseEmvco(data: string) {
    let i = 0;
    const result: Record<string, string> = {};
    while (i < data.length) {
        const id = data.substr(i, 2);
        const len = parseInt(data.substr(i + 2, 2));
        const val = data.substr(i + 4, len);
        result[id] = val;
        i += 4 + len;
    }
    return result;
}

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
                },
                cache: "no-store" 
            });
            if (!res.ok) throw new Error("Simulator Unreachable: " + res.status);
            const html = await res.text();
            
            // Try to get cookies robustly
            let cookies = "";
            // @ts-ignore
            if (typeof res.headers.getSetCookie === 'function') {
                 // @ts-ignore
                 const cookieArray = res.headers.getSetCookie();
                 cookies = cookieArray.join("; ");
            } else {
                 cookies = res.headers.get("set-cookie") || "";
            }

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
    const isUrl = qrUrl.startsWith("http://") || qrUrl.startsWith("https://");
    const sessionPromise = fetchSession();

    let amount = "Rp -";
    let merchantName = "Unknown Merchant";
    
    // NOTE: We do NOT use scraped inputs for the payment payload anymore.
    // The Simulator only reliably accepts { qrCodeUrl, _token }.
    // Scraped inputs from the merchants-app often conflict or belong to a different flow.

    if (isUrl) {
         try {
             // Fetch QR Content ONLY for parsing display details (Amount, Merchant)
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
             }
         } catch (e) {
             console.error("QR Content Fetch Error:", e);
         }
    } else {
         try {
            const emvData = parseEmvco(qrUrl);
            merchantName = emvData["59"] || "Unknown Merchant";
            const amt = emvData["54"] || "0";
            amount = `Rp ${amt}`;
         } catch (e) { merchantName = "Raw QR Code"; }
    }

    // Await Session
    const session = await sessionPromise;
    
    // Construct Payment Context strictly for Simulator
    const paymentFormData: Record<string, string> = {
        qrCodeUrl: qrUrl
    };
    
    if (session.success && session.token) {
        paymentFormData["_token"] = session.token;
    }

    return NextResponse.json({
        success: true,
        data: {
            amount,
            merchantName,
            context: {
                actionUrl: session.actionUrl, 
                formData: paymentFormData,
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

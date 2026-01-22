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
    
    // Check if it's a URL
    const isUrl = qrUrl.startsWith("http://") || qrUrl.startsWith("https://");

    let amount = "Rp -";
    let merchantName = "Unknown Merchant";
    
    // Inquiry is now purely for Display Details
    // The actual payment session is handled atomically by the /api/sandbox/pay endpoint

    if (isUrl) {
         try {
             // Fetch QR Content
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

    return NextResponse.json({
        success: true,
        data: {
            amount,
            merchantName,
            // Context is just the QR URL now, needed for the Pay endpoint
            context: {
                qrUrl: qrUrl 
            }
        }
    });

  } catch (error: any) {
    console.error("Inquiry Critical Error:", error);
    return NextResponse.json({ message: error.message || "System Error" }, { status: 500 });
  }
}

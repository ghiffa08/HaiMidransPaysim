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
    
    // Common function to fetch the payment page (to get cookies/CSRF)
    const fetchSimulatorPage = async () => {
        const response = await fetch("https://simulator.sandbox.midtrans.com/qris/payment", {
            method: "GET",
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
        });
        if (!response.ok) throw new Error("Failed to reach simulator");
        const html = await response.text();
        const cookies = response.headers.get("set-cookie") || "";
        return { html, cookies, url: "https://simulator.sandbox.midtrans.com/qris/payment" };
    };

    // Check if it's a URL or Raw String
    const isUrl = qrUrl.startsWith("http://") || qrUrl.startsWith("https://");

    if (!isUrl) {
        // Handle Raw QRIS (EMVCo)
        try {
            const emvData = parseEmvco(qrUrl);
            const merchantName = emvData["59"] || "Unknown Merchant";
            const amount = emvData["54"] || "0";
            
            // We need a valid session to pay, even for raw strings
            const { html, cookies, url: actionUrl } = await fetchSimulatorPage();
            
            // Parse for CSRF token to include in form
            const csrfMatch = html.match(/<meta[^>]*name="csrf-token"[^>]*content="([^"]+)"/i);
            const token = csrfMatch ? csrfMatch[1] : "";
            
            return NextResponse.json({
                success: true,
                data: {
                    amount: `Rp ${amount}`,
                    merchantName: merchantName,
                    context: {
                        actionUrl: actionUrl,
                        formData: {
                            qrCodeUrl: qrUrl, // The simulator input field name
                            _token: token
                        },
                        cookies: cookies, // Pass cookies back
                        originalUrl: qrUrl,
                        isRaw: true
                    }
                }
            });
        } catch (e: any) {
            console.error("Raw Parse Error", e);
            // Fallback
             return NextResponse.json({
                success: true,
                data: {
                    amount: "Rp 0",
                    merchantName: "Raw QR Code",
                    context: {
                        actionUrl: "https://simulator.sandbox.midtrans.com/qris/payment",
                        formData: { qrCodeUrl: qrUrl },
                        cookies: "", 
                        isRaw: true
                    }
                }
            });
        }
    }

    // 1. Fetch the QR Code URL page 
    // If it's a Direct Simulator URL, we fetch it directly.
    // If it's a Snap URL or other, we might need a different strategy, but for now assume it returns the payment page.
    const response = await fetch(qrUrl, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    if (!response.ok) {
         throw new Error(`Failed to fetch QR Page: ${response.status}`);
    }

    const html = await response.text();
    const cookies = response.headers.get("set-cookie") || "";

    // 2. Parse Details using Regex
    const amountMatch = html.match(/Rp\s*([\d\.]+)/);
    const amountRaw = amountMatch ? amountMatch[1] : "0";
    const amount = amountRaw; 
    
    // Merchant Name (improved regex for specific simulator structures)
    const merchantMatch = html.match(/<div[^>]*class="[^"]*merchant-name[^"]*"[^>]*>(.*?)<\/div>/i) || 
                          html.match(/<h1[^>]*>(.*?)<\/h1>/i) ||
                          html.match(/<strong[^>]*>(.*?)<\/strong>/i);
    const merchantName = merchantMatch ? merchantMatch[1].trim() : "Unknown Merchant";

    // 3. Parse Form Data
    const formActionMatch = html.match(/<form[^>]*action="([^"]+)"/i);
    const formAction = formActionMatch ? formActionMatch[1] : qrUrl; 

    const hiddenInputs: Record<string, string> = {};
    const inputRegex = /<input[^>]*type="hidden"[^>]*name="([^"]+)"[^>]*value="([^"]+)"/gi;
    let match;
    while ((match = inputRegex.exec(html)) !== null) {
        hiddenInputs[match[1]] = match[2];
    }
    
    const csrfMatch = html.match(/<meta[^>]*name="csrf-token"[^>]*content="([^"]+)"/i);
    if (csrfMatch) {
        hiddenInputs["_token"] = csrfMatch[1];
    }

    return NextResponse.json({
        success: true,
        data: {
            amount: `Rp ${amount}`,
            merchantName: merchantName.replace(/<[^>]*>/g, ""), 
            context: {
                actionUrl: formAction,
                formData: hiddenInputs,
                cookies: cookies, // Important: Bind session
                originalUrl: qrUrl
            }
        }
    });

  } catch (error: any) {
    console.error("Inquiry Error:", error);
    return NextResponse.json({ message: error.message || "Failed to parse QR" }, { status: 500 });
  }
}

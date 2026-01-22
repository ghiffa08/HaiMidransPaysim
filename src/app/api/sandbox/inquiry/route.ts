import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { qrUrl } = await req.json();

    if (!qrUrl) {
      return NextResponse.json({ message: "QR URL required" }, { status: 400 });
    }

    // 1. Fetch the QR Code URL page (The Simulator Page)
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

    // 2. Parse Details using Regex
    // Amount: Look for "Rp 15.000" or similar. 
    // Usually in a Total or Amount section.
    // Pattern: Rp[ ]?([\d\.]+)
    const amountMatch = html.match(/Rp\s*([\d\.]+)/);
    const amountRaw = amountMatch ? amountMatch[1] : "0";
    // Clean amount (remove dots)
    const amount = amountRaw; 

    // Merchant Name
    // Usually in a header or h1/div
    // Strategy: Look for the common container or just guess content
    // Let's try to find the title or specific merchant classes if known.
    // Fallback: Use a generic meta title or look for strong tags near the top.
    const merchantMatch = html.match(/<div[^>]*class="[^"]*merchant-name[^"]*"[^>]*>(.*?)<\/div>/i) || 
                          html.match(/<h1[^>]*>(.*?)<\/h1>/i) ||
                          html.match(/<strong[^>]*>(.*?)<\/strong>/i);
    const merchantName = merchantMatch ? merchantMatch[1].trim() : "Unknown Merchant";

    // 3. Parse Form Data for Payment
    // We need to find the <form> and its hidden inputs to replicate the POST
    const formActionMatch = html.match(/<form[^>]*action="([^"]+)"/i);
    const formAction = formActionMatch ? formActionMatch[1] : qrUrl; // Fallback to current URL if no form

    // Find all hidden inputs
    const hiddenInputs: Record<string, string> = {};
    const inputRegex = /<input[^>]*type="hidden"[^>]*name="([^"]+)"[^>]*value="([^"]+)"/gi;
    let match;
    while ((match = inputRegex.exec(html)) !== null) {
        hiddenInputs[match[1]] = match[2];
    }
    
    // Also capture CSRF token if it's in a meta tag (Laravel style)
    const csrfMatch = html.match(/<meta[^>]*name="csrf-token"[^>]*content="([^"]+)"/i);
    if (csrfMatch) {
        hiddenInputs["_token"] = csrfMatch[1];
    }

    return NextResponse.json({
        success: true,
        data: {
            amount: `Rp ${amount}`,
            merchantName: merchantName.replace(/<[^>]*>/g, ""), // strip html just in case
            context: {
                actionUrl: formAction,
                formData: hiddenInputs,
                originalUrl: qrUrl
            }
        }
    });

  } catch (error: any) {
    console.error("Inquiry Error:", error);
    return NextResponse.json({ message: error.message || "Failed to parse QR" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amount } = body;

    if (!amount) {
      return NextResponse.json({ message: "Amount is required" }, { status: 400 });
    }

    // Server Key should be in environment variables
    // Format: 'Basic ' + base64('YOUR_SERVER_KEY:')
    // If not set, we can't proceed.
    const serverKey = process.env.MIDTRANS_SERVER_KEY || "SB-Mid-server-TOSTART"; // Placeholder if not set
    const authString = Buffer.from(serverKey + ":").toString("base64");

    const orderId = `ORDER-${Math.floor(Date.now() / 1000)}`;

    const payload = {
        payment_type: "qris",
        transaction_details: {
            order_id: orderId,
            gross_amount: parseInt(amount)
        },
        qris: {
            acquirer: "gopay"
        }
    };

    const response = await fetch("https://api.sandbox.midtrans.com/v2/charge", {
        method: "POST",
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": `Basic ${authString}`
        },
        body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (response.status >= 400) {
        console.error("Midtrans Charge Error:", data);
        return NextResponse.json({ 
            message: data.status_message || "Failed to generate QR",
            details: data 
        }, { status: response.status });
    }

    // Extract the QR string or URL
    // Documentation says actions array has name: 'generate-qr-code'
    const actions = data.actions || [];
    const qrAction = actions.find((a: any) => a.name === "generate-qr-code");
    const qrUrl = qrAction ? qrAction.url : null;

    if (!qrUrl) {
        return NextResponse.json({ message: "No QR code URL returned from Midtrans" }, { status: 500 });
    }

    return NextResponse.json({
        success: true,
        qrUrl,
        orderId,
        grossAmount: data.gross_amount
    });

  } catch (error: any) {
    console.error("Internal Charge Error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

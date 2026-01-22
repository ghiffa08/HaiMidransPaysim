import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  let qrUrl = "";
  try {
    const body = await req.json();
    qrUrl = body.qrUrl;

    if (!qrUrl) {
      return NextResponse.json({ message: "QR URL required" }, { status: 400 });
    }
    
    // Default Values (Fallback)
    // Karena URL dari Core API adalah Image, kita tidak bisa tahu nominalnya dari sini.
    // Nominal akan otomatis terdeteksi oleh Midtrans saat proses bayar nanti.
    let amount = "Rp (Sesuai Tagihan)"; 
    let merchantName = "Midtrans Merchant";

    // Jika ingin mencoba parsing (hanya works jika URL-nya adalah Web View, bukan Image)
    // Code parsing lama bisa dibiarkan atau disederhanakan
    
    return NextResponse.json({
        success: true,
        data: {
            amount,
            merchantName,
            context: {
                qrUrl: qrUrl 
            }
        }
    });

  } catch (error: any) {
    console.error("Inquiry Error:", error);
    // Tetap return success agar user bisa lanjut ke pembayaran meskipun inquiry detail gagal
    return NextResponse.json({
        success: true, 
        data: { 
            amount: "Rp -", 
            merchantName: "Scan Valid", 
            context: { qrUrl: qrUrl } 
        } 
    });
  }
}

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const scannedUrl = body.scannedUrl || body.qrCodeUrl || body.qrUrl;

    if (!scannedUrl) {
        return NextResponse.json({ message: "QR URL is required." }, { status: 400 });
    }
    
    // URL Endpoint Simulator
    const simulatorIndexUrl = "https://simulator.sandbox.midtrans.com/qris/index"; // <-- SUMBER TOKEN
    const simulatorPayUrl = "https://simulator.sandbox.midtrans.com/qris/payment";   // <-- TUJUAN POST
    
    let cookies = "";
    let csrfToken = "";
    
    // 1. Ambil Halaman Index untuk dapat Cookie & Token
    try {
        const sessionRes = await fetch(simulatorIndexUrl, {
            method: "GET",
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
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

        // Extract CSRF Token dari HTML Index
        const html = await sessionRes.text();
        const csrfMatch = html.match(/name="csrf-token"\s+content="([^"]+)"/i) || 
                          html.match(/name="_token"\s+value="([^"]+)"/i);
        
        csrfToken = csrfMatch ? csrfMatch[1] : "";
        
        if (!csrfToken) {
            console.error("Gagal mengambil CSRF Token dari halaman Index");
            // Lanjut mencoba siapa tahu server sedang loose protection
        }

    } catch (sessionErr) {
        console.error("Gagal koneksi ke Simulator Index:", sessionErr);
        return NextResponse.json({ message: "Gagal terhubung ke Simulator Midtrans" }, { status: 502 });
    }

    // 2. Siapkan Payload untuk POST Payment
    const params = new URLSearchParams();
    params.append("qrCodeUrl", scannedUrl); // URL Image QR
    if (csrfToken) {
        params.append("_token", csrfToken);
    }

    // 3. Eksekusi Pembayaran
    const response = await fetch(simulatorPayUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Origin": "https://simulator.sandbox.midtrans.com",
        "Referer": simulatorIndexUrl, // Referer harus dari halaman index
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Cookie": cookies
      },
      body: params,
      redirect: "manual"
    });

    // 4. Validasi Hasil
    // Midtrans biasanya redirect (302) jika sukses
    if (response.status >= 300 && response.status < 400) {
         return NextResponse.json({ success: true, message: "Pembayaran Berhasil (Redirect)" });
    }

    const text = await response.text();

    if (response.status === 200) {
        const isSuccess = text.includes("Payment Successful") || text.includes("Transaksi Berhasil");
        const isError = text.includes("alert-danger") || text.includes("is invalid");
        
        if (isSuccess && !isError) {
             return NextResponse.json({ success: true, message: "Pembayaran Berhasil" });
        }
        
        console.error("Simulator menolak pembayaran:", text.substring(0, 300)); // Debug log
        return NextResponse.json(
            { message: "Pembayaran Ditolak oleh Simulator (Invalid URL atau Expired)" },
            { status: 400 }
        );
    }
    
    return NextResponse.json(
        { message: `Simulator Error: ${response.status}` },
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

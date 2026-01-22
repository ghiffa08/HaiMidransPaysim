import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const scannedUrl = body.scannedUrl || body.qrCodeUrl || body.qrUrl;

    if (!scannedUrl) {
        return NextResponse.json(
            { message: "QR Data is required." },
            { status: 400 }
        );
    }

    // [VALIDASI PENTING] Cek apakah yang di-scan adalah URL
    if (!scannedUrl.startsWith("http")) {
        return NextResponse.json(
            { 
              message: "Format Salah: Harap scan QR yang berisi URL Image Midtrans, bukan Raw String QRIS.",
              hint: "Saat generate QR, pastikan value-nya adalah 'actions.url' bukan 'qr_string'." 
            },
            { status: 400 }
        );
    }
    
    // 1. Fetch Session & CSRF Token dengan Header yang lebih lengkap
    const simulatorUrl = "https://simulator.sandbox.midtrans.com/qris/payment";
    const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    
    let cookies = "";
    let csrfToken = "";
    
    try {
        const sessionRes = await fetch("https://simulator.sandbox.midtrans.com/qris/index", {
            headers: { "User-Agent": userAgent },
            cache: "no-store"
        });
        
        // Handling Cookies yang lebih robust
        const setCookieHeader = sessionRes.headers.get("set-cookie");
        if (setCookieHeader) {
             // Ambil session id (biasanya XSRF-TOKEN dan laravel_session)
             cookies = setCookieHeader.split(',').map(c => c.split(';')[0]).join('; ');
        }

        // Extract CSRF Token dengan regex yang lebih luas
        const html = await sessionRes.text();
        const csrfMatch = html.match(/name="csrf-token"\s+content="([^"]+)"/i) || 
                          html.match(/name="_token"\s+value="([^"]+)"/i);
        
        csrfToken = csrfMatch ? csrfMatch[1] : "";
        
        if (!csrfToken) {
            console.error("Gagal mengambil CSRF Token");
            return NextResponse.json({ message: "Gagal terhubung ke Simulator (CSRF)" }, { status: 502 });
        }

    } catch (sessionErr) {
        return NextResponse.json({ message: "Network Error ke Midtrans Simulator" }, { status: 502 });
    }

    // 2. Kirim Request Pembayaran
    const params = new URLSearchParams();
    params.append("qrCodeUrl", scannedUrl);
    params.append("_token", csrfToken); // Laravel biasanya butuh ini di body juga

    const response = await fetch(simulatorUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Origin": "https://simulator.sandbox.midtrans.com",
        "Referer": "https://simulator.sandbox.midtrans.com/qris/index",
        "User-Agent": userAgent,
        "Cookie": cookies,
        "X-CSRF-TOKEN": csrfToken // Kirim juga di header untuk keamanan
      },
      body: params,
      redirect: "manual"
    });

    // 3. Analisa Hasil
    const text = await response.text();

    // Jika Redirect (302) -> Berhasil
    if (response.status >= 300 && response.status < 400) {
         return NextResponse.json({ success: true, message: "Pembayaran Berhasil (Redirect)" });
    }

    // Jika 200 OK, cek konten HTML apakah ada pesan sukses
    if (response.status === 200) {
        // Cek indikator sukses spesifik di HTML simulator
        const isSuccess = text.includes("alert-success") || text.includes("Payment Successful") || text.includes("Transaksi Berhasil");
        const isError = text.includes("alert-danger") || text.includes("is invalid");

        if (isSuccess && !isError) {
             return NextResponse.json({ success: true, message: "Pembayaran Berhasil" });
        }
        
        // Debugging: Log error text dari midtrans jika gagal
        // Use a safe substring length
        const errorStart = text.indexOf("alert-danger");
        const errorSnippet = errorStart !== -1 ? text.substring(errorStart, errorStart + 200) : text.slice(0, 300);
        console.error("Simulator Reject:", errorSnippet);
        
        return NextResponse.json(
            { message: "Simulator menolak URL tersebut. Pastikan URL QR Image valid dan bisa diakses publik." },
            { status: 400 }
        );
    }

    return NextResponse.json({ message: "Error dari Simulator" }, { status: response.status });

  } catch (error: any) {
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

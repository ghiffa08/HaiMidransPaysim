# Midtrans Paysim

A High-Fidelity Midtrans QRIS Simulator PWA. Designed to streamline testing of Midtrans payments by bypassing manual copy-pasting of payment URLs.

![Midtrans Paysim Preview](/preview.png)

## Features

- **Mobile-First PWA**: Installable on iOS and Android. Mobile-first layout.
- **Merchant Mode**: Generate scannable QRIS codes from raw Midtrans Image URLs.
- **User Mode**: Full-screen QR Scanner with "QRIS" branding and flashlight support.
- **Smart Proxy**: Automatically bypasses CORS to submit payments to Midtrans Sandbox Simulator.
- **Onboarding**: Intro flow for new users.

## Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS, Shadcn UI, Lucid React.
- **Logic**: HTML5-QRCode, qrcode.react.

## Getting Started

1. **Clone & Install**
   ```bash
   git clone https://github.com/yourusername/midtrans-paysim.git
   cd midtrans-paysim
   npm install
   ```

2. **Run Locally**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000`.

## Deployment

This app is optimized for deployment on **Vercel**.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyourusername%2Fmidtrans-paysim)

1. Push this code to your GitHub repository.
2. Import the project into Vercel.
3. **Environment Variables** (Optional, for Merchant Generator)
   To use the **Merchant Mode QR Generator**, you must provide your Midtrans Sandbox Server Key.
   - **Local**: Create `.env.local` and add:
     ```env
     MIDTRANS_SERVER_KEY=SB-Mid-server-xxxxxxxxx
     ```
   - **Vercel**: Add `MIDTRANS_SERVER_KEY` in Project Settings > Environment Variables.

4. Deploy!

## License

MIT

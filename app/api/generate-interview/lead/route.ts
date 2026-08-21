import { NextResponse } from "next/server";

/*
==================================================
LEAD CAPTURE API
==================================================

Ye route tab call hota hai jab user 5 free questions
use karke naam + email submit karta hai.

ABHI KE LIYE: Emails Vercel ke server logs mein
save hote hain (console.log se) - aap unhe Vercel
dashboard > Deployments > Logs mein dekh sakte ho.

AGE BADHNE KE LIYE (optional):
Jab aapko emails ek jagah list mein chahiye
(spreadsheet jaisa), aap ye kar sakte ho:
1. Google Sheets + Google Apps Script webhook
2. Ya ek free service jaise web3forms.com /
   formspree.io - unka API endpoint yahan call
   kar sakte ho isi function ke andar.
Agar chahiye to bata dena, main wo bhi jod dunga.
*/

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const name = (body.name || "").toString().trim();
    const email = (body.email || "").toString().trim();

    if (!name || !email) {
      return NextResponse.json(
        { success: false, error: "Name and email are required." },
        { status: 400 }
      );
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    // Ye Vercel ke "Logs" tab mein dikhega
    console.log("NEW LEAD SIGNUP:", { name, email, time: new Date().toISOString() });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("LEAD CAPTURE ERROR:", error);

    return NextResponse.json(
      { success: false, error: "Something went wrong." },
      { status: 500 }
    );
  }
}
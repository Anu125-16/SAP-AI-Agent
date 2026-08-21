import { NextResponse } from "next/server";

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
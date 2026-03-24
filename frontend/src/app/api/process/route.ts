import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = "https://web-production-45d97.up.railway.app/process";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const response = await fetch(BACKEND_URL, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: `Backend error: ${response.status} - ${text}` },
        { status: response.status }
      );
    }

    const blob = await response.blob();
    return new NextResponse(blob, {
      status: 200,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "application/zip",
        "Content-Disposition": response.headers.get("Content-Disposition") || 'attachment; filename="results.zip"',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Proxy error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const digits = (req.nextUrl.searchParams.get("zip") ?? "").replace(/\D/g, "");
  if (digits.length !== 7) {
    return NextResponse.json({ results: null }, { status: 400 });
  }
  const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${digits}`);
  const data = await res.json();
  return NextResponse.json(data);
}

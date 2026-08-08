import { NextResponse } from "next/server";

export const dynamic = "force-static";

export function GET() {
  const content = [
    "Contact: mailto:nicolasmoya113@gmail.com",
    "Preferred-Languages: es, en",
    "Expires: 2027-08-07T00:00:00.000Z",
  ].join("\n") + "\n";

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

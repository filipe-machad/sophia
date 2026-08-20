import { cookies } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

export async function serverApi(path: string) {
  const cookieHeader = (await cookies()).toString();

  return fetch(`${API_URL}${path}`, {
    cache: "no-store",
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });
}

const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "https://grwfit.onrender.com/api/v1";

export async function submitDemoRequest(data: {
  name: string;
  phone: string;
  email: string;
  gymName: string;
  city?: string;
}): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/platform/demo-requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.ok;
  } catch {
    return false;
  }
}

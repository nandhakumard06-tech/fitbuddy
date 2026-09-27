import { registerUser } from "@/services/auth.service";
import { setSessionCookie } from "@/lib/auth";
import { getRequestBody, getClientIp, jsonSuccess } from "@/lib/api";
import type { User } from "@/lib/firestore";
import { apiHandler } from "../../_helpers";

export const POST = apiHandler(async (request) => {
  const body = await getRequestBody(request);
  const { user, token } = await registerUser(
    body as { name: string; email: string; password: string; confirmPassword: string },
    getClientIp(request)
  );
  await setSessionCookie(token);
  return jsonSuccess({ user: publicUser(user) }, 201);
});

function publicUser(user: User) {
  return { id: user.id, name: user.name, email: user.email, xp: user.xp };
}

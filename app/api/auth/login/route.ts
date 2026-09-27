import { loginUser } from "@/services/auth.service";
import { setSessionCookie } from "@/lib/auth";
import { getRequestBody, getClientIp, jsonSuccess } from "@/lib/api";
import type { User } from "@/lib/firestore";
import { apiHandler } from "../../_helpers";

export const POST = apiHandler(async (request) => {
  const body = await getRequestBody(request);
  const { user, token } = await loginUser(
    body as { email: string; password: string },
    getClientIp(request)
  );
  await setSessionCookie(token);
  return jsonSuccess({ user: publicUser(user) });
});

function publicUser(user: User) {
  return { id: user.id, name: user.name, email: user.email, xp: user.xp };
}

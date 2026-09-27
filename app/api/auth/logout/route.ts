import { destroySession, clearSessionCookie, getSessionToken } from "@/lib/auth";
import { jsonSuccess } from "@/lib/api";
import { apiHandler } from "../../_helpers";

export const POST = apiHandler(async () => {
  const token = await getSessionToken();
  if (token) {
    await destroySession(token);
  }
  await clearSessionCookie();
  return jsonSuccess({ loggedOut: true });
});

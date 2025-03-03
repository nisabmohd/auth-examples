import { serve } from "@hono/node-server";
import { Hono } from "hono";
import "dotenv/config";
import {
  signIn,
  signInSchema,
  signUp,
  signUpSchema,
} from "./auth/credential.js";
import {
  createSession,
  destroySession,
  getSessionUser,
} from "./auth/session.js";
import { getErrorMessage } from "./lib.js";

const app = new Hono();

// test api
app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.get("/me", async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json(null, { status: 401 });
  return c.json(user);
});

app.post("/credentials/register", async (c) => {
  try {
    const payload = signUpSchema.parse(await c.req.json());
    const user = await signUp(payload);
    console.log(user);

    await createSession(user, c);
    return c.json({ user });
  } catch (err) {
    const message = getErrorMessage(err);
    return c.json({ error: message }, {
      status: 400,
    });
  }
});

app.post("/credentials/login", async (c) => {
  try {
    const payload = signInSchema.parse(await c.req.json());
    const user = await signIn(payload);
    await createSession(user, c);
    return c.json({ user });
  } catch (err) {
    const message = getErrorMessage(err);
    return c.json({ error: message });
  }
});

// TODO:
app.post("/oauth/login/:provider", (c) => {
  return c.text("Hello Hono!");
});

// TODO:
app.post("/oauth/callback/:provider", (c) => {
  return c.text("Hello Hono!");
});

app.post("/logout", async (c) => {
  await destroySession(c);
  return c.json(null);
});

serve({
  fetch: app.fetch,
  port: 3000,
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`);
});

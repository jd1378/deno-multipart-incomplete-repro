import {
  assert,
  assertStrictEquals,
} from "https://deno.land/std@0.86.0/testing/asserts.ts";
import { serve, Server } from "https://deno.land/std@0.86.0/http/server.ts";
import { delay } from "https://deno.land/std@0.86.0/async/delay.ts";
import { MultipartReader } from "https://deno.land/std@0.86.0/mime/multipart.ts";

let server1: Server | undefined;
let handlers: Promise<void | string>[] = [];

// deno-lint-ignore no-explicit-any
function getHeaderValueParams(value: any) {
  const params = new Map();
  // Forced to do so for some Map constructor param mismatch
  value
    .split(";")
    .slice(1)
    // deno-lint-ignore no-explicit-any
    .map((s: any) => s.trim().split("="))
    // deno-lint-ignore no-explicit-any
    .filter((arr: any) => arr.length > 1)
    // deno-lint-ignore ban-ts-comment
    // @ts-ignore
    .map(([k, v]) => [k, v.replace(/^"([^"]*)"$/, "$1")])
    // deno-lint-ignore ban-ts-comment
    // @ts-ignore
    .forEach(([k, v]) => params.set(k, v));
  return params;
}

async function handleServer1() {
  await delay(100);
  server1 = serve({ hostname: "0.0.0.0", port: 3000 });
  for await (const request of server1) {
    const contentTypeHeader = request.headers.get("content-type");
    const params = getHeaderValueParams(contentTypeHeader);
    const reader = new MultipartReader(request.body, params.get("boundary"));
    const form = await reader.readForm();
    const data = [];
    for (const entry of form.entries()) {
      data.push(entry as string[]);
    }
    const bodyContent = new URLSearchParams(data)
      .toString();

    await request.respond({ status: 200, body: bodyContent });
  }
}

const serverOneUrl = "http://localhost:3000";

console.log("requesting any url path echos formdata of request");

async function closeServers() {
  try {
    //send a dummy req after close to close the server
    server1 && server1.close();
    handlers.push(
      fetch(serverOneUrl).then((r) => r.text()).catch((err) => {}),
    );
    await Promise.all(handlers);
    handlers = [];
    server1 = undefined;
  } catch {
    //
  }
}

Deno.test("URLSearchParams accepts string[][]", () => {
  const result = new URLSearchParams([
    ["foo", "bar"],
    ["foo", "baz"],
  ]).toString();

  assertStrictEquals(result, "foo=bar&foo=baz");
});

Deno.test("multipart should read arrays properly", async () => {
  try {
    handlers.push(handleServer1());

    const formData = new FormData();
    formData.append("foo", "bar");
    formData.append("foo", "baz");

    const response = await fetch(serverOneUrl, {
      body: formData,
    }).then((r) => r.text());

    assertStrictEquals(response, "foo=bar&foo=baz");
  } finally {
    await closeServers();
  }
});

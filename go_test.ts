// for test with https://github.com/jd1378/go-simple-multipart-echo
import { assertStrictEquals } from "https://deno.land/std@0.86.0/testing/asserts.ts";

Deno.test("can send form data array", async () => {
  const data = new FormData();
  data.append("foo", "bar");
  data.append("foo", "baz");
  const resp = await fetch("http://localhost:8080/formdata", {
    method: "POST",
    body: data,
  }).then((r) => r.text());

  assertStrictEquals(resp, "foo=bar&foo=baz");
});

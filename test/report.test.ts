import { expect, it } from "vitest";
import { parseGutter, parseLights, reportHtml, type Report } from "../src/report";
import { photoUrl } from "../src/companycam";

const base = { id: "abcdefghjkmnpqrstu", project_id: "1", project_name: "Smith", address: "12 Oak St, Sacramento, CA", contact: { name: "Pat Smith" }, photos: [{ id: "p1", url: "https://img.companycam.com/a.jpg", thumb: "https://img.companycam.com/a_t.jpg" }], status: "approved", created_at: "", updated_at: "", sent_at: null } as const;

it("turns the model's gutter findings into a safe report", () => {
  const b = parseGutter('Sure: {"headline":"Your report","summary":"Mostly sound - with one leak.","findings":[{"photo":9,"where":"front-left corner","what":"Seam is dripping","level":"fix","advice":"Reseal it"},{"photo":1,"where":"back","what":"Clean and flowing","level":"great","advice":""},{"what":""}],"next":["Reseal the corner"]}', 1)!;
  expect(b.overall).toBe("Needs attention");
  expect(b.findings).toHaveLength(2);
  expect(b.findings[0].photo).toBe(1); // a photo number that does not exist is pulled back into range
  expect(b.findings[1].level).toBe("good"); // an unknown level is never shown as a problem
  expect(b.summary).not.toContain(" - ");
  expect(parseGutter("no json here", 1)).toBeNull();
  const html = reportHtml({ ...base, account: "dunzo", kind: "gutter", body: { ...b, summary: "<script>alert(1)</script>" } } as unknown as Report);
  expect(html).not.toContain("<script>");
  expect(html).toContain("Dunzo Gutters");
  expect(html).toContain("https://img.companycam.com/a.jpg");
  expect(reportHtml({ ...base, account: "dunzo", kind: "gutter", photos: [{ id: "x", url: "javascript:alert(1)", thumb: "" }], body: b } as unknown as Report)).not.toContain("javascript:");
});

it("keeps only lighting lines that sit inside the photo", () => {
  const b = parseLights('{"summary":"Warm white along the eaves.","designs":[{"photo":1,"lines":[[[0.1,0.4],[0.5,0.2],[0.9,0.4]],[[2,3],[0.2,0.2]],[[0.1,0.1]]],"note":"Front"}],"takeoff":[{"part":"Front eave","detail":"long run"}],"ideas":["Wreath"]}', 1)!;
  expect(b.designs[0].lines).toHaveLength(1);
  expect(b.takeoff[0].part).toBe("Front eave");
  const html = reportHtml({ ...base, account: "lights", kind: "lights", body: b } as unknown as Report);
  expect(html).toContain("<svg");
  expect(html).toContain("Santa&#39;s Lights");
});

it("picks a sensible picture size", () => {
  const p = { id: "1", uris: [{ type: "thumbnail", uri: "https://x/t.jpg" }, { type: "web", uri: "https://x/w.jpg" }, { type: "original", uri: "https://x/o.jpg" }] };
  expect(photoUrl(p)).toBe("https://x/w.jpg");
  expect(photoUrl(p, "thumb")).toBe("https://x/t.jpg");
  expect(photoUrl({ id: "2" })).toBeNull();
});

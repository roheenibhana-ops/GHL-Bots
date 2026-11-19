import { describe, expect, it } from "vitest";
import { addressKey, findProperty, pickClient, pickTemplate } from "../src/quote";
import type { QuoteTemplateInfo } from "../src/jobber";

const t = (name: string): QuoteTemplateInfo => ({ id: name, name, message: null, disclaimer: null, requiredDeposit: null, lineItems: { nodes: [] } });

describe("pickTemplate", () => {
  const all = [t("Gutter Guards"), t("Dunzo Winter Warm Up Promo Single Story Home"), t("Dunzo Winter Warm Up Promo - Two Story Home")];
  it("finds by story count", () => {
    expect(pickTemplate(all, 1)?.name).toContain("Single Story");
    expect(pickTemplate(all, 2)?.name).toContain("Two Story");
  });
  it("returns null when missing", () => expect(pickTemplate([t("Gutter Guards")], 1)).toBeNull());
});

describe("addressKey and findProperty", () => {
  it("treats street suffix, case and punctuation as equal", () => {
    expect(addressKey("123 Main Street", "95742")).toBe(addressKey("123 main st.", "95742-1234"));
    expect(addressKey("123 Main St", "95742")).not.toBe(addressKey("123 Main St", "95670"));
  });
  it("finds an existing property or returns null for a new address", () => {
    const props = [{ id: "p1", address: { street1: "123 Main Street", postalCode: "95742" } }];
    expect(findProperty(props, { street1: "123 main st", city: "Rancho Cordova", province: "CA", postalCode: "95742" })).toBe("p1");
    expect(findProperty(props, { street1: "9 Oak Ave", city: "Rancho Cordova", province: "CA", postalCode: "95742" })).toBeNull();
  });
});

describe("pickClient", () => {
  it("a single phone match is used only if the name fits", () => {
    expect(pickClient([{ name: "Sam Lee" }], "Sam", "Sam Lee")).toMatchObject({ ambiguous: false, by: "phone and name" });
    expect(pickClient([{ name: "Victoria Partridge" }], "Clark", "Clark Partridge").ambiguous).toBe(true);
  });
  it("none means create", () => expect(pickClient([], "Sam")).toEqual({ client: null, ambiguous: false }));
  it("shared phone: the first name picks the right person", () => {
    const r = pickClient([{ name: "Katie Tinney" }, { name: "Clark Partridge" }, { name: "Victoria Partridge" }], "Clark", "Clark Partridge");
    expect(r).toMatchObject({ ambiguous: false, by: "first name" });
    expect(r.client?.name).toBe("Clark Partridge");
  });
  it("shared phone with no or several name matches stays ambiguous", () => {
    expect(pickClient([{ name: "Katie Tinney" }, { name: "Sarah Hill" }], "Clark").ambiguous).toBe(true);
    expect(pickClient([{ name: "Clark Partridge" }, { name: "Clark Davis" }], "Clark").ambiguous).toBe(true);
  });
  it("couples and short names", () => {
    expect(pickClient([{ name: "Cathy SooHoo" }], "Wilson", "Wilson & Cathy SooHoo").ambiguous).toBe(false);
    expect(pickClient([{ name: "Robert Hale" }], "Rob", "Rob Hale").ambiguous).toBe(false);
  });
});

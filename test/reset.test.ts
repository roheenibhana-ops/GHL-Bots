import { describe, expect, it } from "vitest";
import { archivable, resettableTags } from "../src/reset";

describe("reset helpers", () => {
  it("removes only the bot's own tags, never the contact's other tags", () => {
    expect(resettableTags(["bot-test", "dunzo won", "bot-quote-sent", "Photos Received", "bot-needs-human", "website lead"]))
      .toEqual(["bot-quote-sent", "Photos Received", "bot-needs-human"]);
  });
  it("archives only open quotes, never approved or converted ones", () => {
    const q = [
      { id: "1", quoteStatus: "awaiting_response" }, { id: "2", quoteStatus: "draft" }, { id: "3", quoteStatus: "changes_requested" },
      { id: "4", quoteStatus: "approved" }, { id: "5", quoteStatus: "converted" }, { id: "6", quoteStatus: "archived" },
    ];
    expect(archivable(q)).toEqual(["1", "2", "3"]);
  });
});

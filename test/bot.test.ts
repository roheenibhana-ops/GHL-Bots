import { describe, expect, it } from "vitest";
import { applyOutput, disallowedPrices, HANDOFF_REPLY, nextStep, parseBotOutput, plainPunctuation, promisesDate, replyProblems, stripQuestions, systemPrompt, tryParseBotOutput } from "../src/bot";

describe("parseBotOutput", () => {
  it("reads a good reply and its facts", () => {
    const o = parseBotOutput('{"reply":"Great, is this for 2752 Argolis Way?","intent":"stories","data":{"stories":1}}');
    expect(o).toMatchObject({ intent: "stories", data: { stories: 1 } });
  });
  it("accepts JSON wrapped in other text", () => {
    expect(parseBotOutput('Sure! {"reply":"Hi","intent":"reply_only","data":{}}').intent).toBe("reply_only");
  });
  it("falls back to a safe handoff on junk or unknown intents", () => {
    expect(parseBotOutput("not json").reply).toBe(HANDOFF_REPLY);
    expect(parseBotOutput('{"reply":"x","intent":"launch_missiles","data":{}}').intent).toBe("handoff");
    expect(parseBotOutput('{"reply":"","intent":"reply_only","data":{}}').intent).toBe("handoff");
  });
  it("drops invalid emails and story counts", () => {
    expect(parseBotOutput('{"reply":"ok","intent":"email_given","data":{"email":"nope","stories":3}}').data).toEqual({});
    expect(parseBotOutput('{"reply":"ok","intent":"email_given","data":{"email":" Sam@Example.com "}}').data.email).toBe("sam@example.com");
  });
  it("tolerates real line breaks inside the reply text", () => {
    const o = tryParseBotOutput('{"reply": "Fair question.\nWe are a real company.\n\nWant a quote?", "intent": "reply_only", "data": {}}');
    expect(o?.intent).toBe("reply_only");
    expect(o?.reply).toContain("Fair question.");
  });
  it("tryParse returns null for unreadable output so a retry can happen", () => {
    expect(tryParseBotOutput("sure thing!")).toBeNull();
    expect(tryParseBotOutput('{"reply":"hi","intent":"nonsense","data":{}}')).toBeNull();
  });
});

describe("guardrails", () => {
  it("allows approved prices and blocks invented ones", () => {
    expect(disallowedPrices("It's $219 for a single story, $319 for two, with a $109.50 deposit. Regular is from $249.")).toEqual([]);
    expect(disallowedPrices("I can do it for $177 today")).toEqual(["$177"]);
    expect(disallowedPrices("Foundation damage can run $7,500 or more")).toEqual([]);
    expect(disallowedPrices("That's $1,350")).toEqual(["$1,350"]);
  });
  it("blocks promised dates and times but allows the safe wording", () => {
    for (const bad of ["We can be there tomorrow morning.", "Our crew will come out on Tuesday.", "We're available Thursday if you like.", "I can fit you in at 2pm."]) {
      expect(promisesDate(bad)).toBe(true);
    }
    for (const fine of ["Once your quote is approved, the team will be in touch with dates and times.", "I can't promise a day, but the team will confirm scheduling.", "We clean twice a year, late fall and spring."]) {
      expect(promisesDate(fine)).toBe(false);
    }
  });
  it("blocks links and flags everything wrong with a reply", () => {
    expect(replyProblems("Pay here https://evil.example/x")).toHaveLength(1);
    expect(replyProblems("Great, it's $219 for single story. Want me to send your quote?")).toEqual([]);
    expect(replyProblems("We can come tomorrow for $150")).toHaveLength(2);
  });
});

describe("facts and prompt", () => {
  it("walks size, address, email, quote", () => {
    expect(nextStep({})).toBe("stories");
    expect(nextStep({ stories: 2 })).toBe("address");
    expect(nextStep({ stories: 2, addressConfirmed: true })).toBe("email");
    expect(nextStep({ stories: 2, addressConfirmed: true, email: "a@b.co" })).toBe("quote");
  });
  it("remembers facts, confirms a given address, and marks the quote requested once", () => {
    const f = applyOutput({ firstName: "Sam" }, { reply: "ok", intent: "address_given", data: { address: { street1: "9 Oak Ave", city: "Folsom", province: "CA", postalCode: "95630" }, stories: 2 } });
    expect(f).toMatchObject({ stories: 2, addressConfirmed: true });
    expect(applyOutput(f, { reply: "ok", intent: "ready_for_quote", data: {} }).quoteRequested).toBe(true);
  });
  it("the prompt carries the business knowledge, the hard rules and what is still needed", () => {
    const p = systemPrompt({ firstName: "Sam", stories: 1 });
    expect(p).toContain("30-day money-back promise");
    expect(p).toContain("NEVER promise or suggest a date");
    expect(p).toContain("STILL NEEDED FROM THE CUSTOMER");
    expect(systemPrompt({ stories: 1, addressConfirmed: true, email: "a@b.co" })).toContain("nothing: you have everything");
    expect(systemPrompt({ quoteRequested: true })).toContain("ALREADY been sent on");
  });
});

describe("stripQuestions (handoffs)", () => {
  it("leaves a handoff reply with no question, or the safe default", () => {
    expect(stripQuestions("Gutter guards are priced by our team, so they'll come back with a firm price. Is your home one or two stories?")).toBe("Gutter guards are priced by our team, so they'll come back with a firm price.");
    expect(stripQuestions("Is that right?")).toBe(HANDOFF_REPLY);
  });
});

describe("lenient parsing", () => {
  it("recovers a reply that has unescaped quotation marks inside it", () => {
    const o = tryParseBotOutput('{"reply": "It includes the "Dunzo 360 Home Check" and a photo report.", "intent": "reply_only", "data": {}}');
    expect(o?.intent).toBe("reply_only");
    expect(o?.reply).toContain('"Dunzo 360 Home Check"');
  });
  it("still returns null when there is no reply to recover", () => {
    expect(tryParseBotOutput('{"intent": "reply_only"}')).toBeNull();
  });
});

describe("plainPunctuation", () => {
  it("swaps dashes for commas and hyphens inside words for spaces", () => {
    expect(plainPunctuation("Thanks Sam — we're on it.")).toBe("Thanks Sam, we're on it.");
    expect(plainPunctuation("A single-story home with a 30-day no-clog guarantee")).toBe("A single story home with a 30 day no clog guarantee");
    expect(plainPunctuation("Rain is here – let's get it done")).toBe("Rain is here, let's get it done");
  });
  it("leaves phone numbers and email addresses alone", () => {
    expect(plainPunctuation("Call (916) 571-6644 any time")).toBe("Call (916) 571-6644 any time");
    expect(plainPunctuation("Send it to sam-lee@example.com")).toBe("Send it to sam-lee@example.com");
  });
});

describe("lead time wording", () => {
  it("allows a general lead time but still blocks a promised day", () => {
    expect(promisesDate("We're booking about 1 to 2 weeks out depending on weather, and the team confirms your exact day once the deposit is in.")).toBe(false);
    expect(promisesDate("We can be there on Tuesday morning.")).toBe(true);
  });
});

describe("business hours are not a date promise", () => {
  it("lets hours through", () => {
    expect(promisesDate("We are open Monday to Saturday, and the team replies within one business day.")).toBe(false);
    expect(promisesDate("We can be there on Saturday morning.")).toBe(true);
  });
});

describe("approved page links", () => {
  it("allows one real site link and keeps its hyphens", () => {
    expect(replyProblems("Here you go https://dunzogutters.com/blog/are-gutter-guards-worth-it")).toEqual([]);
    expect(plainPunctuation("Have a look: https://dunzogutters.com/blog/are-gutter-guards-worth-it, it helps")).toContain("are-gutter-guards-worth-it");
  });
  it("blocks invented links and more than one link", () => {
    expect(replyProblems("See https://dunzogutters.com/made-up-page").length).toBeGreaterThan(0);
    expect(replyProblems("See https://example.com/x").length).toBeGreaterThan(0);
    expect(replyProblems("See https://dunzogutters.com/pricing and https://dunzogutters.com/financing").length).toBeGreaterThan(0);
  });
  it("allows the website price ranges", () => {
    expect(disallowedPrices("Seamless is typically $2,500 to $4,500 and guards $1,000 to $3,000")).toEqual([]);
  });
});

describe("links stand alone", () => {
  it("drops punctuation stuck to the end of a link", () => {
    expect(plainPunctuation("See https://dunzogutters.com/pricing. Then call us")).toBe("See https://dunzogutters.com/pricing Then call us");
    expect(plainPunctuation("Try https://santaslightssacramento.com/virtual-design, it is free")).toBe("Try https://santaslightssacramento.com/virtual-design it is free");
    expect(plainPunctuation("Here: https://dunzogutters.com/gutter-guards")).toBe("Here: https://dunzogutters.com/gutter-guards");
  });
});

// Tavily API provider — web search only, classification uses agent.js.
// Requires: TAVILY_API_KEY in .env
import { tavily } from "@tavily/core";

let client = null;

function getClient() {
  const key = process.env.TAVILY_API_KEY;
  if (!key) throw new Error("TAVILY_API_KEY not set in .env");
  if (!client) client = tavily({ apiKey: key });
  return client;
}

export async function search(searchQuery) {
  try {
    const tvly = getClient();
    const res = await tvly.search(searchQuery, {
      searchDepth: "basic",
      maxResults: 8,
      includeAnswer: false,
    });
    const results = res.results ?? [];
    return results
      .map(r => "Title: " + r.title + "\nURL: " + r.url + "\nContent: " + (r.content ?? "").slice(0, 500))
      .join("\n\n");
  } catch (e) {
    console.error("[tavily]", e.message);
    return "";
  }
}

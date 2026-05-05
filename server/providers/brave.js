// Brave Search API provider — web search only, classification uses agent.js.
// Requires: BRAVE_API_KEY in .env

const BASE = "https://api.search.brave.com/res/v1/web/search";

export async function search(searchQuery) {
  const key = process.env.BRAVE_API_KEY;
  if (!key) throw new Error("BRAVE_API_KEY not set in .env");

  const url = BASE + "?q=" + encodeURIComponent(searchQuery) + "&count=8&text_decorations=0&search_lang=en";

  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": key,
      },
    });
    if (!res.ok) {
      console.error("[brave] HTTP", res.status, await res.text());
      return "";
    }
    const data = await res.json();
    const results = data.web?.results ?? [];
    return results
      .map(r => {
        let text = "Title: " + r.title + "\nURL: " + r.url + "\nSnippet: " + (r.description ?? "");
        if (r.extra_snippets?.length) text += "\n" + r.extra_snippets.join("\n");
        return text;
      })
      .join("\n\n");
  } catch (e) {
    console.error("[brave]", e.message);
    return "";
  }
}

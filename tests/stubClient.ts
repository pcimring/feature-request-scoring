import type Anthropic from "@anthropic-ai/sdk";

export interface StubCall {
  [key: string]: unknown;
}

/** A minimal stand-in for the Anthropic client: records each request and returns a canned response. */
export function stubClient(response: Record<string, unknown>) {
  const calls: StubCall[] = [];
  const parse = async (params: StubCall) => {
    calls.push(params);
    return { usage: { input_tokens: 100, output_tokens: 50 }, stop_reason: "end_turn", ...response };
  };
  const client = { messages: { parse }, beta: { messages: { parse } } } as unknown as Anthropic;
  return { client, calls };
}

export function userText(call: StubCall): string {
  const messages = call.messages as { content: string }[];
  return messages.map((m) => m.content).join("\n");
}

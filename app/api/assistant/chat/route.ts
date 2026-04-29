import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOpenAIClient } from "@/lib/openai";

const MODEL = "gpt-4o-mini";

function fallbackAnswer(prompt: string) {
  const normalized = prompt.toLowerCase();

  if (normalized.includes("pipeline")) {
    return "Pipeline treba tretirati kao red odluka: prvo rokovi do 14 dana, zatim tenderi koji čekaju dokumentaciju, pa tek onda nove prilike.";
  }

  if (normalized.includes("sutra") || normalized.includes("predlo")) {
    return "Za sutra izdvojite tendere sa visokim fit score-om, vrijednošću iznad vašeg prosjeka i rokom koji ostavlja barem 7 dana za pripremu.";
  }

  return "Najbolji sljedeći korak je obraditi današnje odluke i dodati samo tendere gdje postoji jasan fit, poznat naručilac ili realna šansa za pripremu dokumentacije.";
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const screenContext = typeof body.screenContext === "string" ? body.screenContext : "dashboard";
  const userContext = typeof body.userContext === "object" && body.userContext ? body.userContext : {};
  const conversationId = typeof body.conversationId === "string" ? body.conversationId : "";

  if (!message) {
    return NextResponse.json({ error: "Poruka je obavezna." }, { status: 400 });
  }

  const conversation =
    conversationId ||
    (
      await supabase
        .from("ai_conversations")
        .insert({ user_id: user.id, screen_context: screenContext })
        .select("id")
        .single()
    ).data?.id;

  if (conversation) {
    await supabase.from("ai_messages").insert({
      conversation_id: conversation,
      user_id: user.id,
      role: "user",
      content: message,
      metadata: { screenContext, userContext },
    });
  }

  if (!process.env.OPENAI_API_KEY) {
    const answer = fallbackAnswer(message);
    if (conversation) {
      await supabase.from("ai_messages").insert({
        conversation_id: conversation,
        user_id: user.id,
        role: "assistant",
        content: answer,
        metadata: { fallback: true },
      });
    }
    return NextResponse.json({ answer, conversationId: conversation, fallback: true });
  }

  const encoder = new TextEncoder();
  const openai = getOpenAIClient();
  let fullAnswer = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const completion = await openai.chat.completions.create({
          model: MODEL,
          stream: true,
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content:
                "Ti si AI asistent za B2B SaaS platformu za javne nabavke u BiH. Odgovaraj na bosanskom, kratko, odlučno i sa jednim preporučenim sljedećim korakom.",
            },
            {
              role: "user",
              content: JSON.stringify({
                question: message,
                screenContext,
                userContext,
              }),
            },
          ],
        });

        for await (const chunk of completion) {
          const delta = chunk.choices[0]?.delta?.content ?? "";
          if (!delta) continue;
          fullAnswer += delta;
          controller.enqueue(encoder.encode(delta));
        }

        if (conversation && fullAnswer) {
          await supabase.from("ai_messages").insert({
            conversation_id: conversation,
            user_id: user.id,
            role: "assistant",
            content: fullAnswer,
            metadata: { model: MODEL },
          });
          await supabase
            .from("ai_conversations")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", conversation)
            .eq("user_id", user.id);
        }

        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Conversation-Id": conversation ?? "",
    },
  });
}

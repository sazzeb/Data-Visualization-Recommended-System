import {
  createRecommendations,
} from "@/lib/recommendations";

import type { TravelPlan } from "@/types/travel";

type RequestBody = {
  plan?: Partial<TravelPlan>;
  uploads?: {
    name?: string;
    content?: string;
  }[];
};

export async function POST(request: Request) {
  try {
    const body =
      (await request.json()) as RequestBody;

    if (!body || typeof body !== "object" || !body.plan) {
      return Response.json(
        { error: "A travel plan is required." },
        { status: 400 }
      );
    }

    const uploads = (Array.isArray(body.uploads) ? body.uploads : [])
      .filter(
        file =>
          typeof file.name === "string" &&
          typeof file.content === "string"
      )
      .map(file => ({
        name: file.name as string,
        content: file.content as string,
      }));

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (payload: unknown) => {
          controller.enqueue(
            encoder.encode(
              `${JSON.stringify(payload)}\n`
            )
          );
        };

        try {
          const result = await createRecommendations(
            body.plan as TravelPlan,
            uploads,
            (percent, message, details) =>
              send({
                type: "progress",
                percent,
                message,
                ...details,
              })
          );

          send({ type: "result", result });
          controller.close();
        } catch (error) {
          send({
            type: "error",
            message:
              error instanceof Error
                ? error.message
                : "Unable to generate recommendations.",
          });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Cache-Control": "no-cache",
        "Content-Type": "application/x-ndjson",
      },
    });
  } catch (error) {
    console.error(
      "[TravelWise] Recommendation generation failed",
      error
    );

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to generate recommendations.",
      },
      { status: 500 }
    );
  }
}

import { Effect, Schema } from "effect"
import * as Tool from "./tool"
import { Question } from "../question"
import DESCRIPTION from "./question.txt"
import { SonderrQuestionTool } from "@/sonderr/tool/question" // sonderr_change

export const Parameters = Schema.Struct({
  questions: Schema.mutable(Schema.Array(Question.Prompt)).annotate({ description: "Questions to ask" }),
})

type Metadata = {
  answers: ReadonlyArray<Question.Answer>
  dismissed?: boolean // sonderr_change
}

export const QuestionTool = Tool.define<typeof Parameters, Metadata, Question.Service>(
  "question",
  Effect.gen(function* () {
    const question = yield* Question.Service

    return {
      description: DESCRIPTION,
      parameters: Parameters,
      execute: (params: Schema.Schema.Type<typeof Parameters>, ctx: Tool.Context<Metadata>) =>
        Effect.gen(function* () {
          // sonderr_change start - surface Question.dismissAll's RejectedError as a normal
          // tool result via SonderrQuestionTool helpers, so Effect.orDie below does not turn
          // it into a defect and kill the in-flight stream.
          const answers = yield* question
            .ask({
              sessionID: ctx.sessionID,
              questions: params.questions,
              tool: ctx.callID ? { messageID: ctx.messageID, callID: ctx.callID } : undefined,
            })
            .pipe(SonderrQuestionTool.catchDismissed)
          if (SonderrQuestionTool.isDismissed(answers)) return SonderrQuestionTool.dismissedResult()
          // sonderr_change end

          const formatted = params.questions
            .map((q, i) => `"${q.question}"="${answers[i]?.length ? answers[i].join(", ") : "Unanswered"}"`)
            .join(", ")

          return {
            title: `Asked ${params.questions.length} question${params.questions.length > 1 ? "s" : ""}`,
            output: `User has answered your questions: ${formatted}. You can now continue with the user's answers in mind.`,
            metadata: {
              answers,
            },
          }
        }).pipe(Effect.orDie),
    }
  }),
)

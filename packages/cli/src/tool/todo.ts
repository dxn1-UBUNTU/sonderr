import { Effect, Schema } from "effect"
import * as Tool from "./tool"
import DESCRIPTION_WRITE from "./todowrite.txt"
import { Todo } from "../session/todo"
// sonderr_change start
import { TodoView } from "../sonderr/todo-view"
// sonderr_change end

export const Parameters = Schema.Struct({
  todos: Schema.mutable(Schema.Array(Todo.Info)).annotate({ description: "The updated todo list" }),
})

type Metadata = {
  todos: Todo.Info[]
  // sonderr_change start
  view?: TodoView.Info
  // sonderr_change end
}

// sonderr_change start - calibration feedback
/** Minimum todo count expected for the highest complexity band present in a list. */
const FLOORS: Record<string, number> = { S: 0, M: 3, H: 8, U: 20 }
const BAND_ORDER = ["S", "M", "H", "U"]

function band(complexity: string | undefined): string | undefined {
  const letter = complexity?.trim().charAt(0).toUpperCase()
  return letter && BAND_ORDER.includes(letter) ? letter : undefined
}

/**
 * Nudge the model when a list is under-rated or under-decomposed. Returned in the tool output
 * so it lands in the transcript, where it can still influence the current turn.
 */
function calibration(todos: readonly Todo.Info[]): string[] {
  if (todos.length === 0) return []
  const notes: string[] = []
  const unrated = todos.filter((todo) => !band(todo.complexity)).length
  if (unrated > 0 && todos.length >= 3)
    notes.push(
      `${unrated} of ${todos.length} todos have no complexity rating. Rate every todo (S1-S4, M1-M4, H1-H4, U1-U10) — the rating drives how much planning and verification the work gets.`,
    )
  const highest = BAND_ORDER.reduce<string | undefined>(
    (acc, letter) => (todos.some((todo) => band(todo.complexity) === letter) ? letter : acc),
    undefined,
  )
  if (highest) {
    const floor = FLOORS[highest] ?? 0
    if (todos.length < floor)
      notes.push(
        `This list is rated up to ${highest} but has only ${todos.length} todos (expected at least ${floor}). Either the work is not decomposed far enough, or the rating is too high. Split the large items until each one is independently verifiable.`,
      )
  }
  return notes
}
// sonderr_change end

export const TodoWriteTool = Tool.define<typeof Parameters, Metadata, Todo.Service>(
  "todowrite",
  Effect.gen(function* () {
    const todo = yield* Todo.Service

    return {
      description: DESCRIPTION_WRITE,
      parameters: Parameters,
      execute: (params: Schema.Schema.Type<typeof Parameters>, ctx: Tool.Context<Metadata>) =>
        Effect.gen(function* () {
          yield* ctx.ask({
            permission: "todowrite",
            patterns: ["*"],
            always: ["*"],
            metadata: {},
          })

          // sonderr_change start
          const before = yield* todo.get(ctx.sessionID)
          const view = TodoView.calculate(before, params.todos)
          // sonderr_change end

          yield* todo.update({
            sessionID: ctx.sessionID,
            todos: params.todos,
          })

          // sonderr_change start
          const notes = calibration(params.todos)
          const output =
            notes.length > 0
              ? `${JSON.stringify(params.todos, null, 2)}\n\n<calibration>\n${notes.map((note) => `- ${note}`).join("\n")}\n</calibration>`
              : JSON.stringify(params.todos, null, 2)
          // sonderr_change end

          return {
            title: `${params.todos.filter((x) => x.status !== "completed").length} todos`,
            output,
            metadata: {
              todos: params.todos,
              // sonderr_change start
              view,
              // sonderr_change end
            },
          }
        }),
    } satisfies Tool.DefWithoutID<typeof Parameters, Metadata>
  }),
)

import { Bus } from "@/bus"
import { BusEvent } from "@/bus/bus-event"
import { Schema } from "effect"
import { capture as captureInstance } from "@/sonderr/instance"
import * as Log from "@sonderr/core/util/log"

const log = Log.create({ service: "hive.events" })

const HiveMemoPayload = Schema.Struct({
  hiveID: Schema.String,
  channel: Schema.String,
  from: Schema.String,
  role: Schema.String,
  text: Schema.String,
})

const HiveCreatedPayload = Schema.Struct({
  hiveID: Schema.String,
  parentSessionID: Schema.String,
})

const HiveCancelledPayload = Schema.Struct({
  hiveID: Schema.String,
})

export namespace HiveEvents {
  export const MemoSent = BusEvent.define("hive.memo_sent", HiveMemoPayload)
  export const MemoRecalled = BusEvent.define("hive.memo_recalled", HiveMemoPayload)
  export const Created = BusEvent.define("hive.created", HiveCreatedPayload)
  export const Cancelled = BusEvent.define("hive.cancelled", HiveCancelledPayload)

  export type HiveMemoPayload = typeof HiveMemoPayload.Type
  export type HiveCreatedPayload = typeof HiveCreatedPayload.Type
  export type HiveCancelledPayload = typeof HiveCancelledPayload.Type

  export function memoSent(input: { hiveID: string; channel: string; from: string; role: string; text: string }) {
    const ctx = captureInstance()
    if (!ctx) return
    try {
      Bus.publish(ctx, MemoSent, input)
    } catch (err) {
      log.warn("failed to publish hive memo_sent event", { err })
    }
  }

  export function memoRecalled(input: { hiveID: string; channel: string; from: string; role: string; text: string }) {
    const ctx = captureInstance()
    if (!ctx) return
    try {
      Bus.publish(ctx, MemoRecalled, input)
    } catch (err) {
      log.warn("failed to publish hive memo_recalled event", { err })
    }
  }

  export function created(input: { hiveID: string; parentSessionID: string }) {
    const ctx = captureInstance()
    if (!ctx) return
    try {
      Bus.publish(ctx, Created, input)
    } catch (err) {
      log.warn("failed to publish hive created event", { err })
    }
  }

  export function cancelled(input: { hiveID: string }) {
    const ctx = captureInstance()
    if (!ctx) return
    try {
      Bus.publish(ctx, Cancelled, input)
    } catch (err) {
      log.warn("failed to publish hive cancelled event", { err })
    }
  }
}

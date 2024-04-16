import { PromiseResolver } from "@yume-chan/async";

import type {
    QueuingStrategy,
    WritableStreamDefaultController,
    WritableStreamDefaultWriter,
} from "./stream.js";
import {
    WritableStream as NativeWritableStream,
    ReadableStream,
} from "./stream.js";

interface Task {
    run<T>(callback: () => T): T;
}

interface Console {
    createTask(name: string): Task;
}

interface GlobalExtension {
    console: Console;
}

// `createTask` allows browser DevTools to track the call stack across async boundaries.
const { console } = globalThis as unknown as GlobalExtension;
const createTask: Console["createTask"] =
    console.createTask?.bind(console) ??
    (() => ({
        run(callback) {
            return callback();
        },
    }));

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
    return typeof value === "object" && value !== null && "then" in value;
}

export class Consumable<T> {
    readonly #task: Task;
    readonly #resolver: PromiseResolver<void>;

    readonly value: T;
    readonly consumed: Promise<void>;

    constructor(value: T) {
        this.#task = createTask("Consumable");
        this.value = value;
        this.#resolver = new PromiseResolver<void>();
        this.consumed = this.#resolver.promise;
    }

    consume() {
        this.#resolver.resolve();
    }

    error(error: unknown) {
        this.#resolver.reject(error);
    }

    tryConsume<U>(callback: (value: T) => U) {
        try {
            let result = this.#task.run(() => callback(this.value));
            if (isPromiseLike(result)) {
                result = result.then(
                    (value) => {
                        this.#resolver.resolve();
                        return value;
                    },
                    (e) => {
                        this.#resolver.reject(e);
                        throw e;
                    },
                ) as U;
            } else {
                this.#resolver.resolve();
            }
            return result;
        } catch (e) {
            this.#resolver.reject(e);
            throw e;
        }
    }
}

export namespace Consumable {
    export interface WritableStreamSink<in T> {
        start?(
            controller: WritableStreamDefaultController,
        ): void | PromiseLike<void>;
        write?(
            chunk: T,
            controller: WritableStreamDefaultController,
        ): void | PromiseLike<void>;
        abort?(reason: unknown): void | PromiseLike<void>;
        close?(): void | PromiseLike<void>;
    }

    export class WritableStream<in T> extends NativeWritableStream<
        Consumable<T>
    > {
        static async write<T>(
            writer: WritableStreamDefaultWriter<Consumable<T>>,
            value: T,
        ) {
            const consumable = new Consumable(value);
            await writer.write(consumable);
            await consumable.consumed;
        }

        constructor(
            sink: WritableStreamSink<T>,
            strategy?: QueuingStrategy<T>,
        ) {
            let wrappedStrategy: QueuingStrategy<Consumable<T>> | undefined;
            if (strategy) {
                wrappedStrategy = {};
                if ("highWaterMark" in strategy) {
                    wrappedStrategy.highWaterMark = strategy.highWaterMark;
                }
                if ("size" in strategy) {
                    wrappedStrategy.size = (chunk) => {
                        return strategy.size!(
                            chunk instanceof Consumable ? chunk.value : chunk,
                        );
                    };
                }
            }

            super(
                {
                    start(controller) {
                        return sink.start?.(controller);
                    },
                    async write(chunk, controller) {
                        await chunk.tryConsume((chunk) =>
                            sink.write?.(chunk, controller),
                        );
                    },
                    abort(reason) {
                        return sink.abort?.(reason);
                    },
                    close() {
                        return sink.close?.();
                    },
                },
                wrappedStrategy,
            );
        }
    }
}

export interface ConsumableReadableStreamController<T> {
    enqueue(chunk: T): Promise<void>;
    close(): void;
    error(reason: unknown): void;
}

export interface ConsumableReadableStreamSource<T> {
    start?(
        controller: ConsumableReadableStreamController<T>,
    ): void | PromiseLike<void>;
    pull?(
        controller: ConsumableReadableStreamController<T>,
    ): void | PromiseLike<void>;
    cancel?(reason: unknown): void | PromiseLike<void>;
}

export class ConsumableReadableStream<T> extends ReadableStream<Consumable<T>> {
    static async enqueue<T>(
        controller: { enqueue: (chunk: Consumable<T>) => void },
        chunk: T,
    ) {
        const output = new Consumable(chunk);
        controller.enqueue(output);
        await output.consumed;
    }

    constructor(
        source: ConsumableReadableStreamSource<T>,
        strategy?: QueuingStrategy<T>,
    ) {
        let wrappedController:
            | ConsumableReadableStreamController<T>
            | undefined;

        let wrappedStrategy: QueuingStrategy<Consumable<T>> | undefined;
        if (strategy) {
            wrappedStrategy = {};
            if ("highWaterMark" in strategy) {
                wrappedStrategy.highWaterMark = strategy.highWaterMark;
            }
            if ("size" in strategy) {
                wrappedStrategy.size = (chunk) => {
                    return strategy.size!(chunk.value);
                };
            }
        }

        super(
            {
                async start(controller) {
                    wrappedController = {
                        async enqueue(chunk) {
                            await ConsumableReadableStream.enqueue(
                                controller,
                                chunk,
                            );
                        },
                        close() {
                            controller.close();
                        },
                        error(reason) {
                            controller.error(reason);
                        },
                    };

                    await source.start?.(wrappedController);
                },
                async pull() {
                    await source.pull?.(wrappedController!);
                },
                async cancel(reason) {
                    await source.cancel?.(reason);
                },
            },
            wrappedStrategy,
        );
    }
}

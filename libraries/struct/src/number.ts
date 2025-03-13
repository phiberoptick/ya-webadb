import {
    getInt16,
    getInt32,
    getInt64,
    getInt8,
    getUint16,
    getUint32,
    getUint64,
    setInt16,
    setInt32,
    setInt64,
    setUint16,
    setUint32,
    setUint64,
} from "@yume-chan/no-data-view";

import { bipedal } from "./bipedal.js";
import type { Field } from "./field.js";

export interface NumberField<T> extends Field<T, never, never> {
    <const U>(infer?: U): Field<U, never, never>;
}

/* #__NO_SIDE_EFFECTS__ */
function factory<T>(
    fn: NumberField<T>,
    size: number,
    serialize: Field<T, never, never>["serialize"],
    deserialize: Field<T, never, never>["deserialize"],
) {
    fn.size = size;
    fn.serialize = serialize;
    fn.deserialize = deserialize;
}

export const u8: NumberField<number> = (() => u8) as never;
factory(
    u8,
    1,
    (value, { buffer, index }) => {
        buffer[index] = value;
    },
    bipedal(function* (then, { reader }) {
        const data = yield* then(reader.readExactly(1));
        return data[0]!;
    }),
);

export const s8: NumberField<number> = (() => s8) as never;
factory(
    s8,
    1,
    (value, { buffer, index }) => {
        buffer[index] = value;
    },
    bipedal(function* (then, { reader }) {
        const data = yield* then(reader.readExactly(1));
        return getInt8(data, 0);
    }),
);

export const u16: NumberField<number> = (() => u16) as never;
factory(
    u16,
    2,
    (value, { buffer, index, littleEndian }) => {
        setUint16(buffer, index, value, littleEndian);
    },
    bipedal(function* (then, { reader, littleEndian }) {
        const data = yield* then(reader.readExactly(2));
        return getUint16(data, 0, littleEndian);
    }),
);

export const s16: NumberField<number> = (() => u16) as never;
factory(
    s16,
    2,
    (value, { buffer, index, littleEndian }) => {
        setInt16(buffer, index, value, littleEndian);
    },
    bipedal(function* (then, { reader, littleEndian }) {
        const data = yield* then(reader.readExactly(2));
        return getInt16(data, 0, littleEndian);
    }),
);

export const u32: NumberField<number> = (() => u32) as never;
factory(
    u32,
    4,
    (value, { buffer, index, littleEndian }) => {
        setUint32(buffer, index, value, littleEndian);
    },
    bipedal(function* (then, { reader, littleEndian }) {
        const data = yield* then(reader.readExactly(4));
        return getUint32(data, 0, littleEndian);
    }),
);

export const s32: NumberField<number> = (() => s32) as never;
factory(
    s32,
    4,
    (value, { buffer, index, littleEndian }) => {
        setInt32(buffer, index, value, littleEndian);
    },
    bipedal(function* (then, { reader, littleEndian }) {
        const data = yield* then(reader.readExactly(4));
        return getInt32(data, 0, littleEndian);
    }),
);

export const u64: NumberField<bigint> = (() => u64) as never;
factory(
    u64,
    8,
    (value, { buffer, index, littleEndian }) => {
        setUint64(buffer, index, value, littleEndian);
    },
    bipedal(function* (then, { reader, littleEndian }) {
        const data = yield* then(reader.readExactly(8));
        return getUint64(data, 0, littleEndian);
    }),
);

export const s64: NumberField<bigint> = (() => u64) as never;
factory(
    s64,
    8,
    (value, { buffer, index, littleEndian }) => {
        setInt64(buffer, index, value, littleEndian);
    },
    bipedal(function* (then, { reader, littleEndian }) {
        const data = yield* then(reader.readExactly(8));
        return getInt64(data, 0, littleEndian);
    }),
);

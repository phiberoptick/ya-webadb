import {
    bipedal,
    buffer,
    decodeUtf8,
    encodeUtf8,
    s16,
    s32,
    s64,
    s8,
    string,
    struct,
    u16,
    u32,
    u64,
    u8,
} from "@yume-chan/struct";

bipedal(function () {});
buffer(u8);
decodeUtf8(new Uint8Array());
encodeUtf8("");
s16(1);
s32(1);
s64(1);
s8(1);
string(1);
u16(1);
u32(1);
u64(1);
u8(1);
struct({}, {});

export * from "@yume-chan/struct";
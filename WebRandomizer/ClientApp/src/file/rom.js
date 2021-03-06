import { readAsArrayBuffer } from '../file/util';
import { parse_rdc } from '../file/rdc';
import { inflate } from 'pako';
import localForage from 'localforage';

export async function prepareRom(world_patch, settings, baseIps, gameId) {
    let rom_blob = null;
    if (gameId === "sm") {
        rom_blob = await localForage.getItem("baseRomSM");
    } else {
        const smRom = await readAsArrayBuffer(await localForage.getItem("baseRomSM"));
        const lttpRom = await readAsArrayBuffer(await localForage.getItem("baseRomLTTP"));
        rom_blob = mergeRoms(new Uint8Array(smRom), new Uint8Array(lttpRom));
    }
    const rom = new Uint8Array(await readAsArrayBuffer(rom_blob));
    const base_patch = maybeCompressed(new Uint8Array(await (await fetch(baseIps, { cache: 'no-store' })).arrayBuffer()));
    world_patch = Uint8Array.from(atob(world_patch), c => c.charCodeAt(0));

    applyIps(rom, base_patch);
    if (gameId === "smz3") {
        await applySprite(rom, 'link_sprite', settings.z3Sprite);
        await applySprite(rom, 'samus_sprite', settings.smSprite);
        if (settings.spinjumps) {
            enableSeparateSpinjumps(rom);
        }
    }
    applySeed(rom, world_patch);

    return rom;
}

function enableSeparateSpinjumps(rom) {
    rom[0x34F500] = 0x01;
}

async function applySprite(rom, block, sprite) {
    if (sprite.path) {
        const url = `${process.env.PUBLIC_URL}/sprites/${sprite.path}`;
        const rdc = maybeCompressed(new Uint8Array(await (await fetch(url)).arrayBuffer()));
        // Todo: do something with the author field
        const [author, blocks] = parse_rdc(rdc);
        blocks[block] && blocks[block](rom);
    }
}

function maybeCompressed(data) {
    const big = false;
    const isGzip = new DataView(data.buffer).getUint16(0, big) === 0x1f8b;
    return isGzip ? inflate(data) : data;
}

function mergeRoms(sm_rom, z3_rom) {
    const data = new Uint8Array(0x600000);

    let pos = 0;
    for (let i = 0; i < 0x40; i++) {
        let hi_bank = sm_rom.slice((i * 0x8000), (i * 0x8000) + 0x8000);
        let lo_bank = sm_rom.slice(((i + 0x40) * 0x8000), ((i + 0x40) * 0x8000) + 0x8000);

        data.set(lo_bank, pos);
        data.set(hi_bank, pos + 0x8000);
        pos += 0x10000;
    }

    pos = 0x400000;
    for (let i = 0; i < 0x20; i++) {
        let hi_bank = z3_rom.slice((i * 0x8000), (i * 0x8000) + 0x8000);
        data.set(hi_bank, pos + 0x8000);
        pos += 0x10000;
    }

    return new Blob([data]);
}

function applyIps(rom, patch) {
    const big = false;
    let offset = 5;
    const footer = 3;
    const view = new DataView(patch.buffer);
    while (offset + footer < patch.length) {
        const dest = (patch[offset] << 16) + view.getUint16(offset + 1, big);
        const length = view.getUint16(offset + 3, big);
        offset += 5;
        if (length > 0) {
            rom.set(patch.slice(offset, offset + length), dest);
            offset += length;
        } else {
            const rle_length = view.getUint16(offset, big);
            const rle_byte = patch[offset + 2];
            rom.set(Uint8Array.from(new Array(rle_length), () => rle_byte), dest);
            offset += 3;
        }
    }
}

function applySeed (rom, patch) {
    const little = true;
    let offset = 0;
    const view = new DataView(patch.buffer);
    while (offset < patch.length) {
        let dest = view.getUint32(offset, little);
        let length = view.getUint16(offset + 4, little);
        offset += 6;
        rom.set(patch.slice(offset, offset + length), dest);
        offset += length;
    }
}

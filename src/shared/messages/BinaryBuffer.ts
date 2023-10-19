export class BinaryBuffer {
    private view: DataView;
    private _offset = 0;
    constructor(bufferOrSize: ArrayBuffer | Uint8Array | number = 32) {
        const buf = typeof bufferOrSize === 'number' ? new ArrayBuffer(bufferOrSize) : bufferOrSize;
        this.view = buf instanceof Uint8Array ? new DataView(buf.buffer, buf.byteOffset, buf.byteLength) : new DataView(buf);
    }

    // getters
    getInt8() {
        const i8 = this.view.getInt8(this.offset);
        this.offset += 1;
        return i8;
    }
    getUint8() {
        const u8 = this.view.getUint8(this.offset);
        this.offset += 1;
        return u8;
    }
    getBool() {
        const data = this.view.getUint8(this.offset);
        this.offset += 1;
        return !!data;
    }
    getInt16LE() {
        this.view.getInt16(this.offset, true);
        this.offset += 2;
        return this;
    }
    getInt16BE() {
        this.view.getInt16(this.offset, false);
        this.offset += 2;
        return this;
    }
    getUint16LE() {
        const u16 = this.view.getUint16(this.offset, true);
        this.offset += 2;
        return u16;
    }
    getUint16BE() {
        const u16 = this.view.getUint16(this.offset, false);
        this.offset += 2;
        return u16;
    }
    getInt32LE() {
        const i32 = this.view.getInt32(this.offset, true);
        this.offset += 4;
        return i32;
    }
    getInt32BE() {
        const i32 = this.view.getInt32(this.offset, false);
        this.offset += 4;
        return i32;
    }
    getUint32LE() {
        const u32 = this.view.getUint32(this.offset, true);
        this.offset += 4;
        return u32;
    }
    getUint32BE() {
        const u32 = this.view.getUint32(this.offset, false);
        this.offset += 4;
        return u32;
    }
    getFloatLE() {
        const float = this.view.getFloat32(this.offset, false);
        this.offset += 4;
        return float ;
    }
    getFloatBe() {
        const float = this.view.getFloat32(this.offset, true);
        this.offset += 4;
        return float;
    }
    getDoubleLE() {
        const double = this.view.getFloat64(this.offset, false);
        this.offset += 8;
        return double;
    }
    getDoubleBE() {
        const double = this.view.getFloat64(this.offset, true);
        this.offset += 8;
        return double;
    }
    getLength() {
        let length = 0;
        let shift = 0;
        let b = 0;

        do {
            b = this.getUint8();
            length = length | ((b & 0x7f) << shift);
            shift += 7;
        } while (b & 0x80);

        return length - 1;
    }
    getAsciiString() {
        const strLength = this.getLength();
        let str = '';
        for (let i = 0; i < strLength; i++) {
            str += String.fromCharCode(this.getUint8());
        }
        return str;
    }
    getUtf8String() {
        const strLength = this.getLength();
        let str = '';
        let i = 0;

        while (i < strLength) {
            const byte = this.getUint8();
            if (byte < 0x80) {
                str += String.fromCharCode(byte);
            } else if (byte >= 0xC0 && byte < 0xE0) {
                const secondByte = this.getUint8();
                str += String.fromCharCode(((byte & 0x1F) << 6) | (secondByte & 0x3F));
            } else if (byte >= 0xE0 && byte < 0xF0) {
                const secondByte = this.getUint8();
                const thirdByte = this.getUint8();
                str += String.fromCharCode(((byte & 0x0F) << 12) | ((secondByte & 0x3F) << 6) | (thirdByte & 0x3F));
            } else if (byte >= 0xF0 && byte < 0xF8) {
                const secondByte = this.getUint8();
                const thirdByte = this.getUint8();
                const fourthByte = this.getUint8();
                const codePoint = (((byte & 0x07) << 18) | ((secondByte & 0x3F) << 12) | ((thirdByte & 0x3F) << 6) | (fourthByte & 0x3F)) - 0x10000;
                str += String.fromCharCode(0xD800 | (codePoint >> 10), 0xDC00 | (codePoint & 0x3FF));
            }
            i++;
        }

        return str;
    }
    getU8Arr() {
        const length = this.getLength();
        if (length === -1) return null;
        return this.getBytes(length);
    }
    getBytes(length: number) {
        const offset = this.offset;
        this.offset += length;
        return new Uint8Array(this.view.buffer, this.view.byteOffset + offset, length);
    }
    getAny() {
        return JSON.parse(this.getUtf8String());
    }
    // writters
    setInt8(value: number) {
        this.view.setInt8(this.offset, value);
        this.offset += 1;
        return this;
    }
    setUint8(value: number) {
        this.view.setUint8(this.offset, value);
        this.offset += 1;
        return this;
    }
    setBool(value: boolean) {
        this.view.setUint8(this.offset, value ? 1 : 0);
        this.offset += 1;
        return this;
    }
    setInt16LE(value: number) {
        this.view.setInt16(this.offset, value, true);
        this.offset += 2;
        return this;
    }
    setInt16BE(value: number) {
        this.view.setInt16(this.offset, value, false);
        this.offset += 2;
        return this;
    }
    setUint16LE(value: number) {
        this.view.setUint16(this.offset, value, true);
        this.offset += 2;
        return this;
    }
    setUint16BE(value: number) {
        this.view.setUint16(this.offset, value, false);
        this.offset += 2;
        return this;
    }
    setInt32LE(value: number) {
        this.view.setInt32(this.offset, value, true);
        this.offset += 4;
        return this;
    }
    setInt32BE(value: number) {
        this.view.setInt32(this.offset, value, false);
        this.offset += 4;
        return this;
    }
    setUint32LE(value: number) {
        this.view.setUint32(this.offset, value, true);
        this.offset += 4;
        return this;
    }
    setUint32BE(value: number) {
        this.view.setUint32(this.offset, value, false);
        this.offset += 4;
        return this;
    }
    setFloatLE(value: number) {
        this.view.setFloat32(this.offset, value, true);
        this.offset += 4;
        return this;
    }
    setFloatBE(value: number) {
        this.view.setFloat32(this.offset, value, false);
        this.offset += 4;
        return this;
    }
    setDoubleLE(value: number) {
        this.view.setFloat64(this.offset, value, true);
        this.offset += 8;
        return this;
    }
    setDoubleBE(value: number) {
        this.view.setFloat64(this.offset, value, false);
        this.offset += 8;
        return this;
    }
    setLength(value: number) {
        if (value < -1 || value > 0x7ffffffe) throw new Error('Invalid length value');
    
        value++;
    
        if (value === 0) {
            this.setUint8(0);
        } else {
            while (value > 0) {
                let byte = value & 0x7f;
                if (value > 0x7f) byte |= 0x80;
                this.setUint8(byte);
                value >>= 7;
            }
        }
    
        return this;
    }
    setAsciiString(asciiString: string) {
        const strLength = asciiString.length;
        let asciiLength = 0;
    
        for (let i = 0; i < strLength; i++) {
            const charCode = asciiString.charCodeAt(i);
            if (charCode <= 127) {
                asciiLength++;
            }
        }
    
        this.setLength(asciiLength);
    
        for (let i = 0; i < strLength; i++) {
            const charCode = asciiString.charCodeAt(i);
            if (charCode <= 127) {
                this.setUint8(charCode);
            }
        }
    }
    setUtf8String(str: string) {
        const strLength = str.length;
        this.setLength(strLength);
        for (let i = 0; i < strLength; i++) {
            const charCode = str.charCodeAt(i);
            if (charCode <= 0x7F) {
                this.setUint8(charCode);
            } else if (charCode <= 0x7FF) {
                this.setUint8(0xC0 | (charCode >> 6));
                this.setUint8(0x80 | (charCode & 0x3F));
            } else if (charCode <= 0xFFFF) {
                this.setUint8(0xE0 | (charCode >> 12));
                this.setUint8(0x80 | ((charCode >> 6) & 0x3F));
                this.setUint8(0x80 | (charCode & 0x3F));
            } else if (charCode <= 0x10FFFF) {
                this.setUint8(0xF0 | (charCode >> 18));
                this.setUint8(0x80 | ((charCode >> 12) & 0x3F));
                this.setUint8(0x80 | ((charCode >> 6) & 0x3F));
                this.setUint8(0x80 | (charCode & 0x3F));
            }
        }
        return this;
    }
    setU8Arr(arr: Uint8Array) {
        this.setLength(arr.byteLength);
        this.setBytes(arr);
        return this;
    }
    setBytes(value: Uint8Array) {
        for (let src = 0, length = value.length, dst = this.offset; src < length; src++, dst++) {
            const v = value[src];
            if (v != null) {
                this.view.setUint8(dst, v);
            } else {
                throw new Error('value[src] is null');
            }
        }
        this.offset += value.byteLength;
        return this;
    }
    setAny<T>(obj:T) {
        this.setUtf8String(JSON.stringify(obj));
        return this;
    }
    get offset() {
        return this._offset;
    }

    set offset(value: number) {
        this._offset = value;
        if (this.view.byteLength < this.offset) {
            const newSize = (this.view.byteLength || 1) * 2;
            const u8Arr = new Uint8Array(newSize);
            const copy = new Uint8Array(this.view.buffer);
            for (let i = 0; i < copy.length; i++) {
                u8Arr[i] = copy[i];
            }
            this.view = new DataView(u8Arr.buffer);
            console.warn("Buffer resized")
        }
    }

    getBuffer() {
        return new Uint8Array(this.view.buffer, this.view.byteOffset, this.offset);
    }
    getRestOfTheBuferBuffer() {
        return new Uint8Array(this.view.buffer.slice(this.offset), this.view.byteOffset, this.view.byteLength);
    }
}


export function utf8StringLen(str: string) {
    const strLength = str.length;
    let len = 0;

    let value = strLength;
    value++;
    if (value === 0) {
        len++;
    } else {
        while (value > 0) {
            let byte = value & 0x7f;
            if (value > 0x7f) byte |= 0x80;
            len++;
            value >>= 7;
        }
    }

    for (let i = 0; i < strLength; i++) {
        const charCode = str.charCodeAt(i);
        if (charCode <= 0x7F) {
            len += 1;
        } else if (charCode <= 0x7FF) {
            len += 2;
        } else if (charCode <= 0xFFFF) {
            len += 3;
        } else if (charCode <= 0x10FFFF) {
            len += 4;
        }
    }
    return len;
}

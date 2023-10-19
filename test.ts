import { BinaryBuffer, utf8StringLen } from "./src/shared/BinaryBuffer"



const str = "👨‍👩‍👦‍👦";
console.log("getUtf8StringLength", utf8StringLen(str));
const a = new BinaryBuffer(6444);
a.setUtf8String(str);

a.offset = 0;
const res = a.getUtf8String();
console.log(res,str, str === res, a.buffer);
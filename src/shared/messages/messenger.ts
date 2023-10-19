import { SpecialEvents, ServerMessagesRaw, ClientMessagesRaw } from "../Messages";
import { Handle, MessageHandleBase, SocketRaw } from "./messageHandle";

const noop = () => {};


export class ClientMessageHandle extends MessageHandleBase<ClientMessagesRaw | SpecialEvents, ServerMessagesRaw | SpecialEvents, null> {


}
export function createClientHandle(send: (message: SocketRaw) => boolean): Handle<ClientMessagesRaw | SpecialEvents, ServerMessagesRaw | SpecialEvents> {
    return {
        connect: noop,
        disconnect: noop,
        message: noop,
        send,
    }
}


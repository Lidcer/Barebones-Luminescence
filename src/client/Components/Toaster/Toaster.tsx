import React from "react";
import { AudioLightSystem } from "../../Utils/AudioSystem";
import { Log } from "../../../shared/interfaces";
import styled from "styled-components";
import { SECOND } from "../../../shared/constants";
import { pushUniqToArray, removeFromArray } from "../../../shared/utils";

const Div = styled.div`
    pointer-events: none;
    touch-action: none;
    position: fixed;
    display: flex;
    flex-direction: column;
    right: 0;
    top: 0;
    margin: 0;
    padding: 0;
    align-items: flex-end;
`;

const Toast = styled.div`
    padding: 5px;
    margin: 5px;
    border-radius: 5px;
    min-width: 200px;
    min-height: 100px;
    background-color: rgba(16, 16, 128, 0.5);
    backdrop-filter: blur(10px);
    transform-origin: right;
    overflow: hidden;
    position: relative;
    span {
        white-space: pre;
    }
`;

interface ToasterProps {
    als: AudioLightSystem;
}

interface DisplayError {
    showing: boolean;
    transition: boolean;
    log: Log;
}

interface ToasterState {
    socketErrors: DisplayError[];
}

export class Toaster extends React.Component<ToasterProps, ToasterState> {
    private readonly SHOW_TIME = SECOND * 10;
    private readonly TRANSITION_TIME = 250;
    private timeouts: number[] = [];

    constructor(props) {
        super(props);
        this.state = {
            socketErrors: [],
        };
    }

    componentDidMount() {
        this.props.als.on("log", this.onNotification);
    }
    componentWillUnmount() {
        for (const number of this.timeouts) {
            clearTimeout(number);
        }
        this.props.als.off("log", this.onNotification);
    }

    onNotification = (socketError: Log) => {
        if (socketError.type === "log") {
            console.log("Server", socketError.title, socketError.description);
            return;
        }
        const socketErrors = [...this.state.socketErrors];
        const displayError = { log: socketError, showing: true, transition: true };
        socketErrors.push(displayError);
        this.setState({ socketErrors });

        const getState = () => {
            const state = { ...this.state };
            const index = state.socketErrors.indexOf(displayError);
            if (index === -1) {
                return undefined;
            }
            const error = state.socketErrors[index];

            return {
                state,
                index,
                error,
                update: () => {
                    this.setState(state);
                },
            };
        };

        // Show
        this.setTimeout(() => {
            const obj = getState();
            if (obj) {
                obj.error.showing = false;
                obj.error.transition = true;
                obj.update();
                this.setTimeout(() => {
                    const obj = getState();
                    if (obj) {
                        obj.error.transition = false;
                        obj.update();
                    }
                }, this.TRANSITION_TIME);
            }
        }, 0);

        // hide
        this.setTimeout(() => {
            const obj = getState();
            if (obj) {
                obj.error.transition = true;
                obj.error.showing = true;
                obj.update();
                this.setTimeout(() => {
                    removeFromArray(obj.state.socketErrors, obj.error);
                    obj.update();
                }, this.TRANSITION_TIME);
            }
        }, this.SHOW_TIME);
    };

    setTimeout(fn: () => void, timeout: number) {
        const number = setTimeout(() => {
            fn();
            removeFromArray(this.timeouts, number);
        }, timeout);
        pushUniqToArray(this.timeouts, number);
    }

    getToast = (socketError: DisplayError, index: number) => {
        const style: React.CSSProperties = {};
        switch (socketError.log.type) {
            case "fatal":
                style.border = "2px solid red";
                break;
            case "error":
                style.border = "2px solid #bf0000";
                break;
            case "warn":
                style.border = "2px solid #26c100";
                break;
            case "info":
                style.border = "2px solid #05c281";
                break;
        }

        if (socketError.transition) {
            style.transition = `transform ${this.TRANSITION_TIME / 1000}s`;
        } else {
            style.transition = "";
        }

        if (socketError.showing) {
            style.transform = "scaleX(0)";
        } else {
            style.transform = "scaleX(1)";
        }

        return (
            <Toast key={index} style={style}>
                <h2>{socketError.log.title}</h2>
                <span>{socketError.log.description || ""}</span>
            </Toast>
        );
    };

    render() {
        return <Div>{this.state.socketErrors.map(this.getToast)}</Div>;
    }
}

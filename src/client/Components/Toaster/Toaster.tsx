import React from "react";
import { AudioLightSystem } from "../../Utils/AudioSystem";
import { SocketLog } from "../../../shared/interfaces";
import styled from "styled-components";
import { SECOND } from "../../../shared/constants";
import { removeFromArray } from "../../../shared/utils";

const Div = styled.div`
  user-select: none;
  pointer-events: none;
  position: fixed;
  display: flex;
  flex-direction: column-reverse;
  right: 0;
  top: 0;
  margin: 10px;
  padding: 10px;
  background-color: rgb(42, 42, 42);
`;

const Toast = styled.div`
  padding: 5px;
  margin: 5px;
  border-radius: 5px;
  min-width: 200px;
  min-height: 100px;
`;

interface ToasterProps {
  als: AudioLightSystem;
}

interface ToasterState {
  socketErrors: SocketLog[];
}

export class Toaster extends React.Component<ToasterProps, ToasterState> {
  private readonly SHOW_TIME = SECOND * 10;
  private timeouts: number[] = [];

  constructor(props) {
    super(props);
    this.state = {
      socketErrors: [],
    };
  }

  componentDidMount() {
    this.props.als.lightSocket.clientSocket.on<[SocketLog]>("socket-log", this.onNotification);
  }
  componentWillUnmount() {
    for (const number of this.timeouts) {
      clearTimeout(number);
    }
  }

  onNotification = (socketError: SocketLog) => {
    const socketErrors = [...this.state.socketErrors];
    socketErrors.push(socketError);
    const n = setTimeout(() => {
      const socErrors = [...this.state.socketErrors];
      removeFromArray(socErrors, socketError);
      removeFromArray(this.timeouts, n);
      this.setState({ socketErrors: socErrors });
    }, this.SHOW_TIME);
    this.setState({ socketErrors });
  };

  getToast = (socketError: SocketLog, index: number) => {
    const style: React.CSSProperties = {};
    switch (socketError.type) {
      case "fatal":
        style.border = "2px solid red";
        break;
      case "error":
        style.border = "2px solid #bf0000";
        break;
      case "info":
        style.border = "2px solid #26c100";
        break;
      case "info":
        style.border = "2px solid #05c281";
        break;
    }

    return (
      <Toast key={index} style={style}>
        <span>{socketError.name}</span>
        <span>{socketError.description || ""}</span>
      </Toast>
    );
  };

  render() {
    return <Div>{this.state.socketErrors.map(this.getToast)}</Div>;
  }
}

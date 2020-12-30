import React from "react";
import styled from "styled-components";
import { ServerSettings } from "../../../shared/interfaces";
import { AudioLightSystem } from "../../Utils/AudioSystem";

const Div = styled.div`
  width: 100%;
  display: flex;
`;

const WidthExtend = styled.div`
  width: 100%;
`;

interface MagicProps {
  als: AudioLightSystem;
}

interface MagicState {
  ips: ServerSettings["magicHome"]["ips"];
  blockedIps: ServerSettings["magicHome"]["blockedIp"];
}

export class MagicTab extends React.Component<MagicProps, MagicState> {
  constructor(props) {
    super(props);
    this.state = {
      blockedIps: [],
      ips: [],
    };
  }

  componentDidMount() {
    const ips = [...this.props.als.lightSocket.settings.magicHome.ips];
    const blockedIps = [...this.props.als.lightSocket.settings.magicHome.blockedIp];
    this.setState({ blockedIps, ips });
  }

  render() {
    return (
      <>
        <h1>Magic home beta</h1>
        Led servers
        {this.state.ips.map((e, i) => {
          return <div key={i}> {e}</div>;
        })}
        Blocked IPS:
        {this.state.blockedIps.map((e, i) => {
          return <div key={i}>{e}</div>;
        })}
      </>
    );
  }
}

import React from "react";
import styled from "styled-components";
import { AudioLightSystem } from "../../Utils/AudioSystem";
import { ServerInfo } from "../../../shared/interfaces";
import * as pretty from "prettysize";
import ReactLoading from "react-loading";
import moment from "moment";

const Div = styled.div`
  padding: 4pt;
  overflow: auto;

  li {
    margin-left: 10pt;
  }
  .border {
    border: 1px solid white;
  }
  .m-2 {
    margin: 8pt;
  }
  .p-2 {
    padding: 8pt;
  }
`;

const CanvasDiv = styled.div`
  width: 100%;
  height: 100px;
  padding: 5pt;
  margin: 5pt;
  display: flex;
`;

const Canvas = styled.canvas`
  height: 100%;
  width: calc(50% - 10pt);
  border: 1px solid white;
  padding: 2px;
`;

interface DeviceTabProps {
  als: AudioLightSystem;
}

interface DeviceTabState {
  serverInfo?: ServerInfo;
}
export class DeviceTab extends React.Component<DeviceTabProps, DeviceTabState> {
  private cpu = React.createRef<HTMLCanvasElement>();
  private temperature = React.createRef<HTMLCanvasElement>();
  private ctxCpu: CanvasRenderingContext2D;
  private ctxTemperature: CanvasRenderingContext2D;
  private destroyed = false;

  constructor(props) {
    super(props);
    this.state = {
      serverInfo: undefined,
    };
  }

  componentDidMount() {

    this.update();
  }

  componentWillUnmount() {
    this.destroyed = true;
  }

  update = async () => {
    const serverInfo = await this.props.als.lightSocket.emitPromiseIfPossible<ServerInfo, []>("device-info");
    if (this.destroyed) {
      return;
    }
    this.setState({ serverInfo });

    this.ctxCpu = this.cpu.current.getContext('2d');
    this.ctxTemperature = this.temperature.current.getContext('2d');

    this.draw(this.ctxCpu, this.cpu.current, serverInfo.cpuUsageHistory);
    this.draw(this.ctxTemperature, this.temperature.current, serverInfo.temperature);

    setTimeout(this.update, 0);
  };

  draw(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, data: number[]) {
    const { width, height } = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, width, height);
    const len = data.length;
    const widthDraw = width / len;
    const max = 100
    ctx.strokeStyle = '#FFFFFF';
    ctx.fillStyle = '#FFFFFF';
    const lastPos = {
      x: 0,
      y: 0,
    };


    for (let i = 0; i < len; i++) {
      const value = data[i];
      const x = i * widthDraw;
      const y = height - ((value / max) * height);
      if (i !== 0) {
        ctx.beginPath();
        ctx.moveTo(lastPos.x, lastPos.y);
        ctx.lineTo(x, y);
        ctx.stroke();
      }

      lastPos.x = x;
      lastPos.y = y;
    }

    //ctx.strokeText(`${data[data.length - 1]}%`, 10, 10);

  }

  render() {
    if (!this.state.serverInfo) {
      return <ReactLoading className='m-2' type={"bars"} color={"#ffffff"} height={50} width={50} />;
    }

    const data = this.state.serverInfo;
    return (
      <Div className='m-2'>
        <CanvasDiv>
          <Canvas ref={this.cpu}/>
          <Canvas ref={this.temperature} />
        </CanvasDiv>
        <Div className='m-2 p-2 border border-terminal'>
          <Div>Arch: {data?.arch}</Div>
          <Div>
            CPU Usage
            <ul>
              <li>User: {moment(Date.now() - data?.cpuUsage?.user / 100).fromNow(true)}</li>
              <li>System: {moment(Date.now() - data?.cpuUsage?.system / 100).fromNow(true)}</li>
            </ul>
          </Div>
          <Div>
            Memory Usage
            <ul>
              <li>CPU: {Math.round(data.cpuUsageHistory[data.cpuUsageHistory.length - 1])}%</li>
              <li>Temperature: {Math.round(data.cpuUsageHistory[data.cpuUsageHistory.length - 1])}°C</li>
            </ul>
          </Div>
          <Div>
            Memory Usage
            <ul>
              <li>External: {pretty(data?.memoryUsage?.external)}</li>
              <li>HeapTotal: {pretty(data?.memoryUsage?.heapTotal)}</li>
              <li>HeapUsed: {pretty(data?.memoryUsage?.heapUsed)}</li>
              <li>Rss: {pretty(data?.memoryUsage?.rss)}</li>
            </ul>
          </Div>
          <Div>Uptime: {moment(Date.now() - data.uptime).fromNow(true)}</Div>
          <Div>Node version: {data?.version}</Div>
        </Div>

        <Div className='m-2 p-2 border border-terminal'>
          <Div>
            <b>Operation System</b>
          </Div>
          <Div>Platform: {data.os.platform}</Div>
          <Div>Release: {data.os.release}</Div>
          <Div>Total memory: {pretty(data.os.totalmem)}</Div>
          <Div>Uptime: {moment(Date.now() - data.os.uptime).fromNow(true)}</Div>
          <Div>
            User info:
            <ul>
              <li>username: {data.os.userInfo.username}</li>
              <li>Homedir: {data.os.userInfo.homedir}</li>
              <li>Shell: {data.os.userInfo.shell}</li>
              <li>GID: {data.os.userInfo.gid}</li>
              <li>UID: {data.os.userInfo.uid}</li>
            </ul>
          </Div>

          <Div className='border border-terminal'>
            <Div className='m-2'>CPUS({data.os.cpus.length}):</Div>
            <Div>
              <ul>
                {data.os.cpus.map((e, i) => {
                  return (
                    <Div className='card-body' style={{ display: "inline-block" }} key={i}>
                      <span>{e.model}</span>
                      <Div>
                        <ul>
                          <li>speed: {Math.round(e.speed / 1000)} Ghz</li>
                          <li>sys: {moment(Date.now() - e.times.sys).fromNow(true)}</li>
                          <li>user: {moment(Date.now() - e.times.user).fromNow(true)}</li>
                          <li>nice: {moment(Date.now() - e.times.nice).fromNow(true)}</li>
                          <li>irq: {moment(Date.now() - e.times.irq).fromNow(true)}</li>
                          <li>idle: {moment(Date.now() - e.times.idle).fromNow(true)}</li>
                        </ul>
                      </Div>
                    </Div>
                  );
                })}
              </ul>
            </Div>
          </Div>
        </Div>
      </Div>
    );
  }
}

import React from "react";
import styled from "styled-components";
import { SECOND } from "../../../shared/constants";
import { DayNames, DoorLogData } from "../../../shared/interfaces";
import { Button } from "../../styles";
import { AudioLightSystem } from "../../Utils/AudioSystem";
import { ServerMessagesRaw } from "../../../shared/Messages";

const Warper = styled.div`
    width: 100%;
`;

const TableDiv = styled.div`
    position: relative;
    background-color: green;
    height: 10px;
`;

const Table = styled.table`
    width: 100%;
    max-width: 100%;

    th {
        text-align: left;
        width: 50px;
    }

    tr td:last-child {
        width: 1%;
        white-space: nowrap;
        background-color: yellow;
    }
`;

interface DoorSensorTabProps {
    als: AudioLightSystem;
}

interface DoorSensorTabState {
    doorLog: DoorLogData;
}
const daysName: DayNames[] = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export class DoorSensor extends React.Component<DoorSensorTabProps, DoorSensorTabState> {
    private destroyed = false;
    private timeout: number;
    constructor(props: DoorSensorTabProps) {
        super(props);
        this.state = {
            doorLog: {},
        };
    }

    async componentDidMount() {
        this.refresh();
        this.timeout = setInterval(this.refresh, SECOND * 10);
    }
    componentWillUnmount() {
        this.destroyed = true;
        if (this.timeout) {
            clearInterval(this.timeout);
            this.timeout = undefined;
        }
    }

    refresh = async () => {
        try {
            const buffer = await this.props.als.lightSocket.emitPromiseIfPossible(ServerMessagesRaw.DoorLog);
            const result = JSON.parse(buffer.getUtf8String());
            if (!this.destroyed) {
                this.setState({ doorLog: result });
            }
        } catch (error) {
            this.props.als.raiseError(error);
        }
    };

    onClear = async () => {
        const confirmation = confirm("Are you sure you want to clear all door logs?");
        if (confirmation) {
            try {
                await this.props.als.lightSocket.emitPromiseIfPossible(ServerMessagesRaw.DoorClear);
                if (!this.destroyed) {
                    this.setState({ doorLog: {} });
                }
            } catch (error) {
                this.props.als.raiseError(error);
            }
        }
    };

    renderTable() {
        const doorLog = this.state.doorLog;
        const keys = Object.keys(doorLog);

        if (!keys.length) {
            return <h5>No door logs yet</h5>;
        }

        let max = 0;
        keys.sort((a, b) => {
            const aDate = new Date(a);
            const bDate = new Date(b);
            return aDate < bDate ? 1 : -1;
        });

        for (const key of keys) {
            const number = doorLog[key];
            if (number > max) {
                max = number;
            }
        }

        return (
            <Table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Count</th>
                        <th>Representation</th>
                    </tr>
                </thead>
                <tbody>
                    {keys.map((v, i) => {
                        const date = new Date(v);
                        const value = doorLog[v];
                        return (
                            <tr key={i}>
                                <th>
                                    {date.toLocaleDateString()} {daysName[date.getDay()]}
                                </th>
                                <th>{value}</th>
                                <th>
                                    <TableDiv
                                        style={{
                                            width: `${(doorLog[v] / max) * 100}%`,
                                        }}
                                    ></TableDiv>
                                </th>
                            </tr>
                        );
                    })}
                </tbody>
            </Table>
        );
    }

    render() {
        return (
            <Warper>
                <h1>Door sensor</h1>
                <Button onClick={this.refresh}>Refresh</Button>
                <Button onClick={this.onClear}>Clear</Button>
                {this.renderTable()}
            </Warper>
        );
    }
}

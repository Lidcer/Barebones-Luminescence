import React from "react";
import { AudioLightSystem } from "../../Utils/AudioSystem";

interface DoorSensorTabProps {
    als: AudioLightSystem;
}

interface DoorSensorTabState {}

export class DoorSensor extends React.Component<DoorSensorTabProps, DoorSensorTabState> {
    constructor(props: DoorSensorTabProps) {
        super(props);
        this.state = {};
    }

    async componentDidMount() {}
    componentWillUnmount() {}

    render() {
        return (
            <div>
                <h1>Door sensor</h1>
            </div>
        );
    }
}

import React from "react";
import styled from "styled-components";

const Warper = styled.div`
    display: inline-block;
    margin: 5px;
    cursor: pointer;
`;

const Bar = styled.div`
    width: 50px;
    height: 10px;
    border-radius: 5px;
    margin-left: 5px;
    display: inline-block;
    transition: color 1s;
`;

const BallWarper = styled.div`
    position: relative;
`;

const Ball = styled.div`
    position: absolute;
    width: 20px;
    height: 20px;
    background-color: white;
    border-radius: 20px;
    bottom: -15px;
    transition: left 0.5s;
`;

interface Props {
    text?: string;
    enabled: boolean;
    onChange: (stateChange: boolean) => void;
}

export class CheckBox extends React.Component<Props, {}> {
    get ballStyle(): React.CSSProperties {
        return {
            left: this.props.enabled ? `30px` : `0px`,
        };
    }
    get backgroundStyle(): React.CSSProperties {
        return {
            backgroundColor: this.props.enabled ? `green` : `red`,
        };
    }

    render() {
        const text = this.props.text || "as";

        return (
            <Warper onClick={() => this.props.onChange(!this.props.enabled)}>
                {text}
                <Bar style={this.backgroundStyle}>
                    <BallWarper>
                        <Ball style={this.ballStyle} />
                    </BallWarper>
                </Bar>
            </Warper>
        );
    }
}

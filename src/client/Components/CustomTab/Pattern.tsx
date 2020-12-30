import React from "react";
import styled from "styled-components";
import { PreGenerateColourPickerPalette } from "../ColourPicker/ColourPickerDataImages";
import { ColourSetter, OnChangeEventType } from "../ColourSetter/ColourSetter";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { faGripLines, faTimes, faArrowUp, faArrowDown } from "@fortawesome/free-solid-svg-icons";
import { LedPatternItem, LightMode, RGB } from "../../../shared/interfaces";
import { hex2rgb, rgb2hex } from "../../../shared/colour";
import { Logger } from "../../../shared/logger";
import { MODES } from "../../../shared/constants";

export const ITEM_HEIGHT = 42; //px
export const BORDER_RADIUS_HEIGHT = 4; //px
export const BACKGROUND_COLOUR = `rgb(32, 32, 32)`; //px

const Div = styled.div`
  width: 350px;
  height: ${ITEM_HEIGHT}px;
  background-color: ${BACKGROUND_COLOUR};
  border-radius: ${BORDER_RADIUS_HEIGHT}px;
  margin: 2px;
  display: flex;
  flex-direction: row;

  color: white;
  transition: opacity 0.25s;

  select {
    border-radius: 5px;
  }

  input {
    width: 50px;
  }
`;
const Button = styled.button`
  background-color: black;
  color: white;
  outline: none;
  border-radius: 4px;
  border: none;
  width: 25px;
  height: 25px;
  transition: background-color 0.1s;
  :hover {
    background-color: rgb(42, 42, 42);
  }
`;

const DragDiv = styled.div`
  cursor: grab;
  background-color: rgba(255, 255, 255, 0.1);
  width: 42px;
  svg {
    font-size: 20px;
    margin: 10px 5px;
  }
`;
const Mock = styled.div`
  pointer-events: none;
  position: fixed;
  z-index: 9999999;
  opacity: 0.9;
`;

const TypeSelector = styled.div`
  display: flex;
  flex-direction: column;
  span {
    font-size: 10px;
  }
`;

const Navigator = styled.div`
  display: flex;
  flex-direction: column;
`;

interface MockElement {
  x: number;
  y: number;
  omy: number;
  my: number;
  lestY: number;
}

interface PatternProps {
  palette: PreGenerateColourPickerPalette;
  ledPattern: LedPatternItem;
  rgb: RGB;
  onUp?: () => void;
  onDown?: () => void;
  onColourUpdate?: (colour: string) => void;
  onModeUpdate?: (mode: LightMode) => void;
  onDelayUpdate?: (delay: number) => void;
  onDelete: () => void;
  selected?: boolean;
  compact?: boolean;
  //TODO: add offset for preview borders
  onDrag?: (distance: number, height: number, finished: boolean) => void;
}

interface PatternState {
  mock?: MockElement;
  delay: number;
}

export class Pattern extends React.Component<PatternProps, PatternState> {
  public readonly HEIGHT = ITEM_HEIGHT;

  private readonly MODES = MODES;
  private ref = React.createRef<HTMLDivElement>();
  private inputFocus = false;
  private destroyed = false;

  constructor(props: PatternProps) {
    super(props);
    this.state = {
      delay: props.ledPattern.delay,
    };
  }

  componentDidMount() {
    window.addEventListener("mouseup", this.onInputUp);
    window.addEventListener("touchend", this.onInputUp);
    window.addEventListener("touchmove", this.onInputMove);
    window.addEventListener("mousemove", this.onInputMove);
  }

  componentWillUnmount() {
    window.removeEventListener("mouseup", this.onInputUp);
    window.removeEventListener("touchend", this.onInputUp);
    window.removeEventListener("touchmove", this.onInputMove);
    window.removeEventListener("mousemove", this.onInputMove);

    this.destroyed = true;
  }

  componentDidUpdate(props: PatternProps) {
    if (props.ledPattern.delay !== this.state.delay && !this.inputFocus) {
      this.setState({ delay: this.props.ledPattern.delay });
    }
  }

  fontAwesome(
    icon: IconProp,
    onClick: (ev: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void,
    style?: React.CSSProperties,
  ) {
    return (
      <>
        <Button onClick={onClick} style={style}>
          <FontAwesomeIcon icon={icon} />
        </Button>
      </>
    );
  }

  onDown = () => {
    this.props.onDown && this.props.onDown();
  };
  onUp = () => {
    this.props.onUp && this.props.onUp();
  };

  onInputChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const value = ev.target.value.replace(/\D/g, "");
    let number = parseInt(value);
    if (isNaN(number)) {
      number = 1000;
    }
    number = Math.abs(number) || 1;
    this.setState({ delay: number });
  };

  onColourChange = (type: OnChangeEventType, hex: string) => {
    const rgb = hex2rgb(hex);
    if (!rgb) {
      Logger.debug("Incorrect colour type from colour setter", hex);
      return;
    }
    this.props.onColourUpdate(hex);
  };

  private isTouch(ev: TouchEvent | MouseEvent): ev is TouchEvent {
    return !!(ev as TouchEvent).touches;
  }

  onInputMove = (ev: TouchEvent | MouseEvent) => {
    if (!this.state.mock) {
      return;
    }
    const mock = { ...this.state.mock };
    let clientY = 0;
    if (this.isTouch(ev)) {
      clientY = ev.touches[0].clientY;
    } else {
      clientY = ev.clientY;
    }
    const y = mock.my + clientY - mock.my;
    mock.y = y;
    mock.lestY = clientY;
    this.setState({ mock });
    this.props.onDrag(mock.omy - clientY, this.HEIGHT, false);
  };

  onInputUp = () => {
    if (this.state.mock) {
      const mock = this.state.mock;
      this.props.onDrag(mock.omy - mock.lestY, this.HEIGHT, true);
      if (!this.destroyed) {
        this.setState({ mock: undefined });
      }
    }
  };

  onInputDown = (my: number) => {
    const { x, y } = this.ref.current.getBoundingClientRect();
    const mock: MockElement = { my, x, y, omy: my, lestY: my };
    this.setState({ mock });
  };

  get draggableDiv() {
    if (!this.props.onDrag) {
      return null;
    }
    const onTouch = (ev: React.TouchEvent<HTMLDivElement>) => {
      const my = ev.touches[0].clientY;
      this.onInputDown(my);
    };

    const onMouseDown = (ev: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
      const my = ev.clientY;
      this.onInputDown(my);
    };

    return (
      <DragDiv onMouseDown={onMouseDown} onTouchStart={onTouch}>
        <FontAwesomeIcon icon={faGripLines} />
      </DragDiv>
    );
  }

  get hasMock() {
    return !!this.state.mock;
  }

  get mock() {
    if (!this.state.mock) {
      return null;
    }
    const style: React.CSSProperties = {
      left: `${this.state.mock.x}px`,
      top: `${this.state.mock.y}px`,
    };

    return (
      <Mock style={style}>
        <Pattern
          ledPattern={this.props.ledPattern}
          rgb={this.props.ledPattern.rgb}
          onDelete={() => {}}
          palette={this.props.palette}
        />
      </Mock>
    );
  }

  get style(): React.CSSProperties {
    if (this.props.selected) {
      return { border: `1px solid yellow` };
    }
    if (!this.hasMock) return undefined;

    return { opacity: "0.25" };
  }

  onModeChange = (ev: React.ChangeEvent<HTMLSelectElement>) => {
    this.props.onModeUpdate && this.props.onModeUpdate(ev.target.value as LightMode);
  };

  render() {
    return (
      <>
        {this.mock}
        <Div ref={this.ref} style={this.style}>
          <Navigator>
            <Button onClick={this.onUp} style={this.props.onUp ? {} : { opacity: "0" }}>
              <FontAwesomeIcon icon={faArrowUp} />
            </Button>
            <Button onClick={this.onDown} style={this.props.onDown ? {} : { opacity: "0" }}>
              <FontAwesomeIcon icon={faArrowDown} />
            </Button>
          </Navigator>

          <ColourSetter
            colourRGB={this.props.rgb}
            palette={this.props.palette}
            onChange={this.onColourChange}
            renderInput={this.props.compact}
            mode='set'
          />
          <TypeSelector>
            {this.props.compact ? <span>Mode</span> : null}
            <select
              title={"Mode"}
              name='type'
              id='type'
              onChange={this.onModeChange}
              value={this.props.ledPattern.mode}
            >
              {this.MODES.map((e, i) => (
                <option key={i} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </TypeSelector>
          <TypeSelector>
            {this.props.compact ? <span>Delay</span> : null}

            <input
              title={"Delay"}
              type='text'
              value={this.state.delay}
              onChange={this.onInputChange}
              onKeyUp={ev => {
                if (ev.key.toLowerCase() === "enter" && this.state.delay !== this.props.ledPattern.delay) {
                  this.props.onDelayUpdate(this.state.delay);
                }
              }}
              onFocus={() => {
                this.inputFocus = true;
              }}
              onBlur={() => {
                this.inputFocus = false;
                this.props.onDelayUpdate && this.props.onDelayUpdate(this.state.delay);
              }}
            />
          </TypeSelector>
          {this.fontAwesome(faTimes, () => this.props.onDelete())}
          {this.draggableDiv}
        </Div>
      </>
    );
  }
}

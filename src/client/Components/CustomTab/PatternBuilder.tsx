import React from "react";
import styled from "styled-components";
import { LedPattern, LedPatternItem, LightMode } from "../../../shared/interfaces";
import { cloneDeep, removeFromArray } from "../../../shared/utils";
import { PatternAnimator } from "../../../shared/patternAnimator";
import { PreGenerateColourPickerPalette } from "../ColourPicker/ColourPickerDataImages";
import { BACKGROUND_COLOUR, BORDER_RADIUS_HEIGHT, ITEM_HEIGHT, Pattern } from "./Pattern";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { AudioLightSystem } from "../../Utils/AudioSystem";
import { hex2rgb, rgb2hex } from "../../../shared/colour";
import { Logger } from "../../../shared/logger";
import { MODES } from "../../../shared/constants";

const Div = styled.div`
  width: 370px;
  padding: 5px;
  border-radius: 4px;
  border: 1px solid white;
`;
const DivButtons = styled.div`
  width: 300px;
  display: inline-block;
  padding: 5px;
`;
const PatternList = styled.div`
  max-height: 500px;
  overflow-y: auto;
  overflow-x: none;
`;
const AddButton = styled.button`
  width: 100%;
  height: ${ITEM_HEIGHT}px;
  background-color: ${BACKGROUND_COLOUR};
  border-radius: ${BORDER_RADIUS_HEIGHT}px;
  color: white;
  border: none;
  outline: none;
  transition: background-color 0.15s;
  :hover {
    background-color: rgba(255, 255, 255, 0.15);
  }
`;
const Button = styled.button`
  color: white;
  padding: 5px;
  margin: 2px;
  background-color: ${BACKGROUND_COLOUR};
  border-radius: ${BORDER_RADIUS_HEIGHT}px;
  border: none;
  outline: none;
`;
const MoveDiv = styled.div`
  margin: 0;
  padding: 0 5px;
  transition: border-color 0.5s;
  border-radius: 2px;
  overflow-y: auto;
  overflow-x: none;
`;
const Canvas = styled.canvas`
  width: fit-content;
  border: 2px solid black;
  border-radius: 2px;
`;
const Select = styled.select`
  outline: none;
  background-color: ${BACKGROUND_COLOUR};
  border-radius: ${BORDER_RADIUS_HEIGHT}px;
  color: white;
  margin: 0 5px;
  border: none;
  padding: 5px;
`;
const Input = styled.input`
  outline: none;
  background-color: ${BACKGROUND_COLOUR};
  border-radius: ${BORDER_RADIUS_HEIGHT}px;
  color: white;
  margin: 0 5px;
  border: none;
  padding: 5px;
  :disabled {
    color: rgba(128, 128, 128);
  }
`;

interface PatternProps {
  palette: PreGenerateColourPickerPalette;
  als: AudioLightSystem;
  selectedPattern?: string;
}

interface PatternState {
  activePatternIndex: number;
  patterns: LedPattern[];
  livePreview: boolean;
  moveIndex?: number;
  patternRename?: string;
  unsaved: boolean;
  deletionPending: boolean;
  updateAll?: {
    delay: number;
    mode: LedPatternItem["mode"];
  };
}

export class PatternBuilder extends React.Component<PatternProps, PatternState> {
  private destroyed = false;
  private div = React.createRef<HTMLDivElement>();
  private ref = React.createRef<HTMLCanvasElement>();
  private canvasWidth = 350;
  private canvasHeight = 28;
  private patternAnimator = new PatternAnimator();
  private ctx: CanvasRenderingContext2D;
  private frame: number | undefined;
  private lastSent = Date.now();
  private DELAY_LIVE_PREVIEW = 10;

  constructor(props: PatternProps) {
    super(props);
    this.state = {
      activePatternIndex: 0,
      patterns: [],
      livePreview: false,
      unsaved: false,
      deletionPending: false,
    };
  }

  updatePatternAnimator() {
    requestAnimationFrame(() => {
      if (this.destroyed) {
        return;
      }
      const pattern = this.state.patterns[this.state.activePatternIndex];

      if (pattern) {
        this.patternAnimator.loadPattern(pattern);
        this.patternAnimator.start();
      }
    });
  }

  async componentDidMount() {
    const p = await this.props.als.patternService.fetchPattern();
    const patterns = cloneDeep(p);
    let activePatternIndex = 0;
    if (this.props.selectedPattern !== undefined) {
      const pattern = this.props.als.patternService.patterns.find(e => (e.name = this.props.selectedPattern));
      const index = this.props.als.patternService.patterns.indexOf(pattern);
      if (index !== -1) {
        activePatternIndex = index;
      }
    }

    this.setState({ patterns, activePatternIndex });
    this.patternAnimator.loadPattern(patterns[0]);
    this.patternAnimator.start();
    this.ctx = this.ref.current.getContext("2d");
    this.draw();

    this.props.als.patternService.on("update", this.onPatternUpdate);
  }
  componentWillUnmount() {
    this.patternAnimator.stop();
    this.destroyed = true;
    cancelAnimationFrame(this.frame);
    this.props.als.patternService.off("update", this.onPatternUpdate);
  }

  onPatternUpdate = (patterns: LedPattern[]) => {
    let index = this.state.activePatternIndex;
    if (!patterns[index]) {
      index = 0;
    }
    this.setState({ patterns, activePatternIndex: index });
  };

  get pattern() {
    return this.state.patterns[this.state.activePatternIndex];
  }
  get patternLength() {
    return this.pattern && this.pattern.ledPattern ? this.pattern.ledPattern.length : 0;
  }

  live = async () => {
    const now = Date.now();
    if (!this.state.livePreview || this.lastSent > now - this.DELAY_LIVE_PREVIEW) {
      return;
    }
    try {
      const s = this.patternAnimator.state;
      this.props.als.lightSocket.clientSocket.emit("rgb-set", s.r, s.g, s.b);
    } catch (error) {
      Logger.error("Socket sent", error);
    }
    this.lastSent = Date.now();
  };

  private toggleLivePreview = () => {
    const toggle = !this.state.livePreview;
    if (this.frame) {
      clearTimeout(this.frame);
    }
    this.frame = undefined;
    if (toggle) {
      this.frame = setTimeout(this.live, this.DELAY_LIVE_PREVIEW);
    }
    this.setState({ livePreview: toggle });
  };

  private draw = () => {
    const { width, height } = this.ref.current.getBoundingClientRect();
    const s = this.patternAnimator.state;
    this.ctx.fillStyle = `${rgb2hex(s.r, s.g, s.b)}`;
    this.ctx.fillRect(0, 0, width, height);

    const p = this.patternAnimator;
    this.ctx.font = " bold 15px arial";
    const MAX_RGB = 255;
    this.ctx.fillStyle = `${rgb2hex(MAX_RGB - s.r, MAX_RGB - s.g, MAX_RGB - s.b)}`;
    const text = `${p.patternExecutionTime} / ${p.totalTime}`;
    this.ctx.fillText(text, 0, 12);
    const text2 = `[${p.index + 1}/${p.frames}] ${p.indexTime} / ${p.nextIndexTime}`;
    this.ctx.fillText(text2, 0, 25);
    this.live();

    this.frame = requestAnimationFrame(this.draw);
  };

  private setActivePattern(ledPattern: LedPattern) {
    const activePatternIndex = this.state.patterns.indexOf(ledPattern);
    if (activePatternIndex === -1) {
      return;
    }
    if (!this.patternAnimator.isPatternActive(ledPattern)) {
      this.patternAnimator.loadPattern(ledPattern);
    }
    this.setState({ activePatternIndex });
  }
  onUp = (ledPattern: LedPatternItem) => {
    this.changePosition(ledPattern, 1);
  };
  onDown = (ledPattern: LedPatternItem) => {
    this.changePosition(ledPattern, -1);
  };
  onDelete = (ledPattern: LedPatternItem) => {
    const pattern = this.pattern;
    if (!pattern) {
      return;
    }
    const index = pattern.ledPattern.indexOf(ledPattern);
    const patterns = [...this.state.patterns];
    patterns[this.state.activePatternIndex].ledPattern.splice(index, 1);
    this.setState({ patterns, unsaved: true });
    this.updatePatternAnimator();
  };

  changePosition(ledPattern: LedPatternItem, move: number) {
    if (!this.pattern) return;
    const pattern = { ...this.pattern };
    const index = pattern.ledPattern.indexOf(ledPattern);

    const pat = pattern.ledPattern;
    const temp = pat[index - move];
    pat[index - move] = pat[index];
    pat[index] = temp;
    const patterns = this.state.patterns;
    patterns[this.state.activePatternIndex].ledPattern = pat;
    this.setState({ patterns, unsaved: true });
    this.updatePatternAnimator();
  }
  onDrag = (ledPatternItem: LedPatternItem, distance: number, height: number, finished: boolean) => {
    //console.log(ledPatternItem,distance, height, finished)
    const move = Math.round(distance / height);

    const patterns = [...this.state.patterns];
    const ledPattern = this.pattern.ledPattern;
    const index = ledPattern.indexOf(ledPatternItem);
    let moveIndex = 0;
    if (ledPattern[index - move]) {
      moveIndex = ledPattern.indexOf(ledPattern[index - move]);
    } else if (move < 0) {
      moveIndex = ledPattern.length - 1;
    } else {
      moveIndex = 0;
    }
    if (finished) {
      const temp = ledPattern[index];
      ledPattern[index] = ledPattern[moveIndex];
      ledPattern[moveIndex] = temp;
      this.setState({ moveIndex: undefined, patterns, unsaved: true });
    } else {
      this.setState({ moveIndex, patterns });
    }
    this.updatePatternAnimator();
  };
  onAdd = () => {
    const patterns = [...this.state.patterns];
    const p = this.props.als.patternService.getRandomPatternItem();
    patterns[this.state.activePatternIndex].ledPattern.push(p);
    this.setState({ patterns, unsaved: true });
    this.updatePatternAnimator();
  };
  createNewPattern = () => {
    if (this.state.unsaved) {
      return;
    }
    const pattern = this.props.als.patternService.newPattern();
    const patterns = [...this.state.patterns];
    patterns.push(pattern);
    const activePatternIndex = patterns.indexOf(pattern);
    this.setState({ patterns, activePatternIndex, patternRename: pattern.name, unsaved: true });
    this.updatePatternAnimator();
  };
  private deletePattern = async () => {
    const pattern = this.pattern;
    try {
      this.props.als.patternService.deletePattern(pattern.name);
      await this.props.als.patternService.sendPatterns();
      this.setState({ unsaved: false, deletionPending: false });
    } catch (error) {
      Logger.debug("Pattern builder", error);
    }
  };

  get header() {
    if (this.state.patternRename !== undefined) {
      const changeName = () => {
        this.props.als.patternService.changeName(this.pattern, this.state.patternRename);
        this.setState({ patternRename: undefined, unsaved: true });
      };

      return (
        <DivButtons>
          <Input
            value={this.state.patternRename}
            onKeyUp={ev => {
              if (ev.key.toLowerCase() === "enter") {
                changeName();
              }
            }}
            onChange={ev => this.setState({ patternRename: ev.target.value })}
            onBlur={changeName}
          />
        </DivButtons>
      );
    }
    const select =
      this.state.unsaved || !this.pattern ? (
        <Input
          title={"You have to save changes before you can switch pattern"}
          value={(this.pattern && this.pattern.name) || "No patterns"}
          disabled
        />
      ) : (
        <Select
          title={"patternName"}
          name='patternName'
          id='patternName'
          onChange={ev => {
            this.setActivePattern(this.state.patterns.find(p => p.name === ev.target.value));
          }}
          value={this.pattern.name}
        >
          {this.state.patterns.map((m, i) => {
            return (
              <option key={i} value={m.name}>
                {m.name}
              </option>
            );
          })}
        </Select>
      );

    const saveButton = this.state.unsaved ? (
      <div>
        <Button
          title={"Save pattern on server"}
          onClick={async () => {
            this.props.als.patternService.setPattern(this.state.patterns[this.state.activePatternIndex]);
            try {
              await this.props.als.patternService.sendPatterns();
              this.setState({ unsaved: false });
            } catch (error) {
              Logger.debug("Pattern update failed", error);
            }
          }}
        >
          Save
        </Button>
      </div>
    ) : null;

    const renameButton = this.state.patterns.length ? (
      <Button title={"Rename the pattern"} onClick={() => this.setState({ patternRename: this.pattern.name })}>
        Rename Pattern
      </Button>
    ) : null;

    const newButton = this.state.unsaved ? null : (
      <Button title={"Add new pattern"} onClick={this.createNewPattern}>
        New Pattern
      </Button>
    );
    const livePreview = this.pattern ? (
      <Button title={"Show Live preview"} onClick={this.toggleLivePreview}>
        {this.state.livePreview ? "Stop live" : "Go live"}
      </Button>
    ) : null;
    const deletePattern = this.state.deletionPending ? (
      <div>
        <Button style={{ backgroundColor: "red" }} onClick={this.deletePattern}>
          Yes
        </Button>
        <Button style={{ backgroundColor: "green" }} onClick={() => this.setState({ deletionPending: false })}>
          No
        </Button>
      </div>
    ) : (
      <Button title={"DeletePattern"} onClick={() => this.setState({ deletionPending: true })}>
        Delete pattern
      </Button>
    );

    const updateAllFn = () => {
      if (this.state.updateAll) {
        const patterns = [...this.state.patterns];
        const items = patterns[this.state.activePatternIndex].ledPattern;
        for (const item of items) {
          item.delay = this.state.updateAll.delay;
          item.mode = this.state.updateAll.mode;
        }
        this.setState({ patterns, updateAll: undefined, deletionPending: false, unsaved: true });
        this.updatePatternAnimator();
      } else {
        const pattern: LedPattern = this.pattern || this.props.als.patternService.newPattern();
        const ledPattern = pattern.ledPattern[0];
        this.setState({
          updateAll: {
            delay: ledPattern.delay,
            mode: ledPattern.mode,
          },
        });
      }
    };

    const onUpdateAllChangeDelay = (ev: React.ChangeEvent<HTMLInputElement>) => {
      const int = Math.abs(parseInt(ev.target.value.replace(/\D/g, "")) || 1);
      const updateAll = { ...this.state.updateAll };
      updateAll.delay = int;
      this.setState({ updateAll });
    };
    const onUpdateAllChangeMode = (ev: React.ChangeEvent<HTMLSelectElement>) => {
      const updateAll = { ...this.state.updateAll };
      updateAll.mode = ev.target.value as LightMode;
      this.setState({ updateAll });
    };

    const updateAll = this.state.updateAll ? (
      <div>
        <div>
          <span>Delay:</span>
          <Input value={this.state.updateAll.delay} onChange={onUpdateAllChangeDelay} />
        </div>
        <div>
          <span>Mode</span>
          <Select name='update-all-mode' id='update-all-mode' onChange={onUpdateAllChangeMode}>
            {MODES.map((m, i) => {
              return (
                <option key={i} value={m}>
                  {m}
                </option>
              );
            })}
          </Select>
        </div>

        <Button onClick={updateAllFn}>Change them all</Button>
      </div>
    ) : (
      <Button onClick={updateAllFn}>Update many</Button>
    );

    return (
      <DivButtons>
        {select}
        {updateAll}
        {livePreview}
        {saveButton}
        {renameButton}
        {newButton}
        {deletePattern}
      </DivButtons>
    );
  }

  onColourUpdate = (ledPattern: LedPatternItem, colour: string) => {
    if (!this.pattern) return;
    const pattern = { ...this.pattern };
    const index = pattern.ledPattern.indexOf(ledPattern);
    pattern.ledPattern[index].rgb = hex2rgb(colour);
    const patterns = [...this.state.patterns];
    this.setState({ patterns });
    this.updatePatternAnimator();
  };

  onModeUpdate = (ledPattern: LedPatternItem, mode: LightMode) => {
    if (!this.pattern) return;
    const pattern = { ...this.pattern };
    const index = pattern.ledPattern.indexOf(ledPattern);
    pattern.ledPattern[index].mode = mode;
    const patterns = [...this.state.patterns];
    this.setState({ patterns });
    this.updatePatternAnimator();
  };
  onDelayUpdate = (ledPattern: LedPatternItem, delay: number) => {
    if (!this.pattern) return;
    const pattern = { ...this.pattern };
    const index = pattern.ledPattern.indexOf(ledPattern);
    pattern.ledPattern[index].delay = delay;
    const patterns = [...this.state.patterns];
    this.setState({ patterns });
    this.updatePatternAnimator();
  };
  get patternList() {
    if (!this.pattern || !this.pattern.ledPattern) {
      return <span>No pattern</span>;
    }
    return (
      <PatternList>
        {this.pattern.ledPattern.map((ledPattern, i) => {
          const style = (): React.CSSProperties => {
            if (this.state.moveIndex === undefined) {
              return null;
            }
            return { userSelect: "none", pointerEvents: "none" };
          };

          return (
            <MoveDiv key={i} style={style()}>
              <Pattern
                palette={this.props.palette}
                onUp={i !== 0 ? () => this.onUp(ledPattern) : undefined}
                onDown={i !== this.patternLength - 1 ? () => this.onDown(ledPattern) : undefined}
                onDelete={() => this.onDelete(ledPattern)}
                onColourUpdate={colour => this.onColourUpdate(ledPattern, colour)}
                onModeUpdate={mode => this.onModeUpdate(ledPattern, mode)}
                onDelayUpdate={delay => this.onDelayUpdate(ledPattern, delay)}
                ledPattern={ledPattern}
                rgb={ledPattern.rgb}
                selected={this.state.moveIndex === i}
                compact={true}
                onDrag={(distance, height, finished) => this.onDrag(ledPattern, distance, height, finished)}
              />
            </MoveDiv>
          );
        })}
        <AddButton onClick={this.onAdd}>
          <FontAwesomeIcon icon={faPlus} />
        </AddButton>
      </PatternList>
    );
  }

  render() {
    return (
      <Div ref={this.div}>
        <Canvas ref={this.ref} height={this.canvasHeight} width={this.canvasWidth} />
        {this.header}
        {this.patternList}
      </Div>
    );
  }
}

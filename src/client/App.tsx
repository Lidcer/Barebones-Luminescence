import React from "react";
import { AudioLightSystem } from "./Utils/AudioSystem";
import { BrowserStorage } from "./Utils/BrowserStorage";
import { Colour } from "./Components/ColourPicker/ColourPicker";
import styled from "styled-components";
import { Tabs, NavigationBar } from "./Components/NavigationBar/NavigationBar";
import { Tab } from "./Components/Tabs/Tabs";
import { ColourTitle } from "./Components/ColourTitle/ColourTitle";
import { PreGenerateColourPickerPalette } from "./Components/ColourPicker/ColourPickerDataImages";
import { Toaster } from "./Components/Toaster/Toaster";

const Button = styled.button`
    display: block;
    background-color: rgb(32, 32, 32);
    color: white;
    border-radius: 5px;
    border: none;
    margin: 5px;
    padding: 5px;
    outline: none;
`;
const Authenticate = styled.div`
    display: inline-block;
    background-color: rgb(16, 16, 16);
    align-items: center;
    color: white;
    border-radius: 5px;
    border: none;
    margin: 5px;
    padding: 5px;
    outline: none;
`;

const Input = styled.input`
    background-color: rgb(8, 8, 8);
    height: 20px;
    align-items: center;
    color: white;
    outline: none;
    border-radius: 5px;
    border: 1px solid rgb(64, 64, 64);
`;

interface AppState {
    showVisualizers: boolean;
    visualizerWidth: number;
    password: string;
    error: string;
    tab: Tabs;
}

interface AppProps {}

export class App extends React.Component<AppProps, AppState> {
    private readonly activeTabKey = "active-tab";
    private sending = false;
    private audioLightSystem = new AudioLightSystem();
    private preGenerateColourPickerPalette = new PreGenerateColourPickerPalette();
    private destroyed = false;

    constructor(props) {
        super(props);
        this.state = {
            showVisualizers: BrowserStorage.getBoolean("showVisualizers"),
            visualizerWidth: window.innerWidth,
            password: "",
            error: "",
            tab: (BrowserStorage.getString(this.activeTabKey) as Tabs) || "Manual",
        };
    }

    componentDidMount() {
        window.addEventListener("resize", this.resize);
        this.audioLightSystem.lightSocket.on("connect", this.update);
        this.audioLightSystem.lightSocket.on("auth", this.update);
        this.audioLightSystem.lightSocket.on("disconnect", this.update);
        (window as any).als = this.audioLightSystem;
        this.preGenerateColourPickerPalette.generate(
            !DEV
                ? undefined
                : percent => {
                      //Logger.debug("Loading", percent);
                  },
        );
    }
    componentWillUnmount() {
        this.destroyed = true;
        window.removeEventListener("resize", this.resize);
        this.audioLightSystem.lightSocket.off("connect", this.update);
        this.audioLightSystem.lightSocket.off("auth", this.update);
        this.audioLightSystem.lightSocket.off("disconnect", this.update);
    }

    update = () => {
        this.forceUpdate();
    };

    resize = () => {
        this.setState({ visualizerWidth: window.innerWidth });
    };

    handleColorChange = async (colour: Colour) => {
        BrowserStorage.setString("lastColour", colour.hex);
        const { r: red, g: green, b: blue } = colour.rgb;
        if (this.sending) return;
        this.sending = true;
        await this.audioLightSystem.lightSocket.setColor(red, green, blue);
        this.sending = false;
    };

    onShowVisualizers = () => {
        const newState = !this.state.showVisualizers;
        this.setState({ showVisualizers: newState });
        BrowserStorage.setBoolean("showVisualizers", newState);
    };

    onTabChange = (tab: Tabs) => {
        if (tab !== "MagicHome") {
            BrowserStorage.setString(this.activeTabKey, tab);
        }
        this.setState({ tab });
    };

    get renderContent() {
        return (
            <>
                <NavigationBar als={this.audioLightSystem} tab={this.state.tab} onChange={this.onTabChange} />
                <Tab tab={this.state.tab} als={this.audioLightSystem} palette={this.preGenerateColourPickerPalette} />
            </>
        );
    }

    get socketWindow() {
        // const soc = this.audioLightSystem.lightSocket;
        // if (soc.socket && !soc.socket.connected) {
        //     return (
        //         <Authenticate>
        //             <h1>Not connected</h1>
        //         </Authenticate>
        //     );
        // }

        const auth = async () => {
            this.setState({ error: "" });
            try {
                await this.audioLightSystem.lightSocket.authenticate(this.state.password);
                this.setState({ password: "" });
            } catch (error) {
                this.setState({ error: error.message });
            }
        };

        return (
            <Authenticate>
                <h2>Password</h2>
                <Input
                    type='password'
                    value={this.state.password}
                    onChange={e => this.setState({ password: e.target.value })}
                    onKeyUp={e => {
                        if (e.key.toLowerCase() === "enter") {
                            auth();
                        }
                    }}
                />
                <Button onClick={auth}>Connect</Button>
                <span>{this.state.error}</span>
            </Authenticate>
        );
    }

    render() {
        const soc = this.audioLightSystem.lightSocket;
        return (
            <>
                <ColourTitle als={this.audioLightSystem} />
                {soc.socket.connected ? this.renderContent : this.socketWindow}
                <Toaster als={this.audioLightSystem} />
            </>
        );
    }
}

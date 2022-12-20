import React from "react";
import { AudioLightSystem } from "../../Utils/AudioSystem";
import { AudioAnalyser } from "../../../shared/audioAnalyser";
import ReactLoading from "react-loading";
import { RawImageLocation } from "../../../shared/interfaces";
import moment from "moment";
import styled from "styled-components";

const Container = styled.div`
    margin: auto;
`;

const Overlay = styled.div`
    position: absolute;
    margin-left: 5px;
    margin-top: 5px;
`;

const Btn = styled.button`
    outline: none;
    margin: 5px;
    padding: 5px;
    border: none;
`;

interface RawImageLocationEx extends RawImageLocation {
    cachedBlobUrl: string;
}

export interface CameraImageLocation {
    lastImage?: RawImageLocationEx;
    doorOpens: RawImageLocationEx[];
    images: RawImageLocationEx[];
}
interface CameraTabProps {
    als: AudioLightSystem;
}

interface CameraTabState {
    data?: CameraImageLocation;
    takingImage: boolean;
}
export class CameraTab extends React.Component<CameraTabProps, CameraTabState> {
    private loaded = new Map<string, string>();
    private loadingPlaceHolder: string;

    private loading = new Map<string, ((url: string) => void)[]>();

    constructor(props: CameraTabProps) {
        super(props);
        this.state = {
            takingImage: false,
        };
    }

    preload = async (img?: RawImageLocationEx) => {
        console.log("called", img.name);
        if (img) {
            if (img.token) {
                const id = this.props.als.lightSocket.socket.id;
                const urls = this.loading.get(img.date);
                if (urls) {
                    urls.push(url => {
                        img.cachedBlobUrl = url;
                        this.forceUpdate();
                    });
                    return;
                }
                if (this.loaded.has(img.date)) {
                    img.cachedBlobUrl = this.loaded.get(img.date);
                    return;
                }

                const lArray: ((url: string) => void)[] = [];
                this.loading.set(img.date, lArray);

                try {
                    const actualUrl = `./webcam/${id}/${img.token}`;
                    const data = await fetch(actualUrl);
                    if (!data.ok || data.status >= 400) {
                        throw new Error("Invalidated image");
                    }
                    const blobUrl = await data.blob();
                    const url = (img.cachedBlobUrl = URL.createObjectURL(blobUrl));
                    this.loaded.set(img.date, url);
                    for (const fn of lArray) {
                        fn(url);
                    }
                    this.loading.delete(img.date);
                    this.forceUpdate();
                } catch (e) {
                    const failed = (img.cachedBlobUrl = await this.drawTextImage(
                        `Expired: ${moment(img.date).format()}`,
                        1,
                        50,
                    ));
                    for (const fn of lArray) {
                        fn(failed);
                    }
                    this.loading.delete(img.date);
                    this.forceUpdate();
                }
            } else {
                img.cachedBlobUrl = await this.drawTextImage(`Forbidden to load: ${moment(img.date).format()}`, 1, 50);
                this.forceUpdate();
            }
        }
    };
    drawTextImage(text: string, x = 50, y = 50) {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 250;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, 250, 250);
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(text, x, y);
        return new Promise<string>(r => {
            canvas.toBlob(async blob => {
                r(URL.createObjectURL(blob));
            });
        });
    }

    async componentDidMount() {
        this.loadingPlaceHolder = await this.drawTextImage("loading");
        this.updateImages();
        this.props.als.lightSocket.socket.on("door-image-available", this.updateImages);
    }

    componentWillUnmount() {
        this.props.als.lightSocket.socket.off("door-image-available", this.updateImages);
    }

    updateImages = async () => {
        this.loaded.clear();
        this.loading.clear();
        const data = await this.props.als.lightSocket.emitPromiseIfPossible<CameraImageLocation, void[]>(
            "get-cam-data",
        );

        data.images = data.images.filter(i => !data.images.find(e => e.name === i.name));
        this.preload(data.lastImage);
        data.images.forEach(this.preload);
        data.doorOpens.forEach(this.preload);

        this.setState({
            data,
        });
    };

    renderImage(image: RawImageLocationEx, suffix: string) {
        return (
            <div>
                <Overlay>
                    {suffix} {moment(image.date).format("DD/MM/YYYY HH:mm:ss")}
                </Overlay>
                <img src={`${image.cachedBlobUrl || this.loadingPlaceHolder}`} alt={image.name} />
            </div>
        );
    }
    renderLastImage() {
        if (this.state.data.lastImage) {
            return (
                <div>
                    <h1>Last image</h1>
                    {this.renderImage(this.state.data.lastImage, "")}
                </div>
            );
        }
        return null;
    }
    renderDoorImages() {
        if (this.state.data.doorOpens.length) {
            return (
                <div>
                    <h1>Door images</h1>
                    {this.state.data.doorOpens.map((img, i) => (
                        <div key={i}>{this.renderImage(img, "Door")}</div>
                    ))}
                </div>
            );
        }
        return null;
    }
    renderOtherImages() {
        if (this.state.data.images.length) {
            return (
                <div>
                    <h1>Other images</h1>
                    {this.state.data.images.map((img, i) => (
                        <div key={i}>{this.renderImage(img, "Other")}</div>
                    ))}
                </div>
            );
        }
        return null;
    }

    renderDoors() {
        if (this.state.data.lastImage) {
            return (
                <div>
                    <h1>Last image</h1>
                    {this.renderImage(this.state.data.lastImage, "")}
                </div>
            );
        }
        return null;
    }
    takeImage = async () => {
        this.setState({
            takingImage: true,
        });
        try {
            const ok = await this.props.als.lightSocket.emitPromiseIfPossible<boolean, void[]>("take-cam-image");
            if (ok) {
                this.updateImages();
            }
        } catch (error) {
            console.error(error);
        }
        this.setState({
            takingImage: false,
        });
    };

    render() {
        if (!this.state.data) {
            return <ReactLoading className='m-2' type={"bars"} color={"#ffffff"} height={50} width={50} />;
        }

        return (
            <Container>
                <Btn onClick={this.takeImage} disabled={this.state.takingImage}>
                    Take image
                </Btn>
                {this.renderLastImage()}
                {this.renderDoorImages()}
                {this.renderOtherImages()}
            </Container>
        );
    }
}

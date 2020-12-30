# The perfect LED controller

This project is in very early development most the stuff are still prototypes

The perfect LED controller a LED server that is hosed on raspberry pi which is active 24/7 and control LEDs accordingly to set mode. It has easy to use GUI. The server. It is also capable to analyse audio frequency and control LEDs adoringly you need to have audio client hosed on the device you want to analyse music. With built in scheduler it can control LEDs without touching the controls.

## There are two operating modes
- Magic home mode - requires magic home controller (It is very slow)
- Pi mode - Need custom build circuit to work (could be super fast)

It currently only work with magic home controller.
### Built-in Modes
    Manually - Manually set mode
    Audio - Controls colour accordingly to audio
    AutoPilot - Based schedule

## Plans
 - Colour setter (done)
 - Audio analyser (partially done)
 - Average screen colour capture(Might not be possible)
 - Scheduler with custom patterns (WIP)
 - Motion sensor mode

### Running (currently only dev builds)
```
npm run dev # starts LED server
npm run dev-audio-server # starts audio server
```

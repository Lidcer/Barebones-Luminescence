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

## up to 3 Servers?
*This project* requires you to host 1-3 server.
*First server* dedicated to LED processing webpage hosting includes scheduler and on server audio processing.
Second server if entire thing is running on `PI mode` it is not needed if you have `Magic home mode`. 
It should basically it should kill lag by running asynchronously as the original lib code handles pins synchronously 
in my testing having everything under one server was creating lag. I've tried to put everything to tread but it turns out that it is limited and usually will throw error at the start.
*Third server* Audio capture server. Only works on windows. It captures audio then sends PCM data to server to process and analyse the sound and convert to LED. It can use on server processing or on device processing. One may be faster than other.

### Running (currently only dev builds)
Fullfil your config file carefully as that depends how many server it will initially start
```
npm run dev # starts LED server
npm run dev-audio-server # starts audio server
```

# Raspberry pi note!
modules audify and pigpio are not compatible together on linux machine. You have to run `npm install` wait for everything to install which will probably yeet with a bunch of errors in console then you need to uninstall audify `npm uninstall audify` then reinstall `npm install gpio`. After that is should start without any problem. 


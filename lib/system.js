// utilities for getting information about the system
const fs = require("fs");
const os = require("os");
const path = require("path");
const screenshot = require("screenshot-desktop");
const si = require("systeminformation");
const activeWindow = require("active-win");
const robot = require("@hurdlegroup/robotjs");
const sharp = require("sharp");
const { emitter, events } = require("./events.js");

let primaryDisplay = null;

// get the primary display
// this is the only display we ever target, because fuck it
// the vm only has one and most people only have one
const getPrimaryDisplay = async () => {
  // calculate scaling resolution
  let graphics = await si.graphics();
  let primaryDisplay = graphics.displays.find(
    (display) => display.main == true,
  );

  return primaryDisplay;
};

const getSystemInformationOsInfo = async () => {
  return await si.osInfo();
};

const tmpFilename = () => {
  return path.join(os.tmpdir(), `${new Date().getTime() + Math.random()}.png`);
};

const captureAndResize = async (scale = 1, silent = false, mouse = false) => {
  try {
    const primaryDisplay = await getPrimaryDisplay();
    if (!silent) {
      emitter.emit(events.screenCapture.start, {
        scale,
        silent,
        display: primaryDisplay,
      });
    }

    let step1 = tmpFilename();
    let step2 = tmpFilename();

    await screenshot({ filename: step1, format: "png" });

    // Fetch the mouse position
    const mousePos = robot.getMousePos();

    // Location of cursor image
    const cursorPath = path.join(__dirname, "resources", "cursor.png");

    // resize to 1:1 px ratio
    const sharpInstance = sharp(step1).resize(
      Math.floor(primaryDisplay.currentResX * scale),
      Math.floor(primaryDisplay.currentResY * scale),
    );

    if (mouse) {
      // composite the mouse image ontop
      sharpInstance.composite([{ input: cursorPath, left: mousePos.x, top: mousePos.y }]);
    }

    await sharpInstance.toFile(step2);

    emitter.emit(events.screenCapture.end, {
      scale,
      silent,
      display: primaryDisplay,
    });

    return step2;
  } catch (error) {
    emitter.emit(events.screenCapture.error, {
      error,
      scale,
      silent,
      display: primaryDisplay,
    });
    throw error;
  }
};

// our handy screenshot function
const captureScreenBase64 = async (scale = 1, silent = false, mouse = false) => {
  let step2 = await captureAndResize(scale, silent, mouse);
  return fs.readFileSync(step2, "base64");
};

const captureScreenPNG = async (scale = 1, silent = false, mouse = false) => {
  return await captureAndResize(scale, silent, mouse);
};

const platform = () => {
  let platform = process.platform;
  if (platform === "darwin") {
    platform = "mac";
  } else if (platform === "win32") {
    platform = "windows";
  } else if (platform === "linux") {
    platform = "linux";
  } else {
    throw new Error("Unsupported platform");
  }
  return platform;
};

// this is the focused window
const activeWin = async () => {
  return await activeWindow();
};

const getMousePosition = async () => {
  return await robot.getMousePos();
};

module.exports = {
  getPrimaryDisplay,
  captureScreenBase64,
  captureScreenPNG,
  getMousePosition,
  primaryDisplay,
  activeWin,
  platform,
  getSystemInformationOsInfo,
};

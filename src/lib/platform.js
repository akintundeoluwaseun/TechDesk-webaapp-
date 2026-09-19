// Which shell is this running in?
//
// This is the web build: a browser tab, and nothing else. The flags stay so
// that code shared with the desktop and Android builds compiles unchanged --
// a file that asks "am I in Electron?" gets a straight no rather than a
// missing export.
export const IS_ANDROID_APP = false;
export const IS_DESKTOP_APP = false;
export const IS_WEB_APP = true;

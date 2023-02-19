"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _Logger_instances, _Logger_config, _Logger_stackItems, _Logger_executionTime, _Logger_terminalInterval, _Logger_spinnerIndex, _Logger_loadingSpinner, _Logger_roomLink, _Logger_colored, _Logger_closeStep, _Logger_getStackItemIndex, _Logger_finishAll, _Logger_lastStackItem_get, _Logger_firstStackItem_get, _Logger_convertHRTimeToTimestamp, _Logger_convertTimestampToSeconds, _Logger_formatSeconds, _Logger_find, _Logger_addStackItem, _Logger_getParentStackItem, _Logger_getStackItemIndexedAddress, _Logger_getStackItemLevel, _Logger_printLog, _Logger_formatStackItemLevelIndicator, _Logger_formatStackItemLog, _Logger_getLogColor;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
const axios_1 = __importDefault(require("axios"));
const readline_1 = __importDefault(require("readline"));
const START_DEFAULT_MESSAGE = "Initialing";
const FINISH_DEFAULT_MESSAGE = "Finishing";
const ASCII = {
    RESET: "\u001b[0m",
    BLACK: "\u001b[30m",
    RED: "\u001b[31m",
    GREEN: "\u001b[32m",
    YELLOW: "\u001b[33m",
    BLUE: "\u001b[34m",
    MAGENTA: "\u001b[35m",
    CYAN: "\u001b[36m",
    WHITE: "\u001b[37m",
};
const TYPE_COLOR_MAPPING = {
    LOG: "WHITE",
    STEP: "MAGENTA",
    STEP_END: "MAGENTA",
    LOGGER_START: "GREEN",
    LOGGER_FINISH: "GREEN",
};
const spinner = {
    interval: 80,
    frames: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
};
class Logger {
    constructor(config) {
        _Logger_instances.add(this);
        _Logger_config.set(this, void 0);
        _Logger_stackItems.set(this, []);
        _Logger_executionTime.set(this, 0);
        _Logger_terminalInterval.set(this, void 0);
        _Logger_spinnerIndex.set(this, 0);
        _Logger_loadingSpinner.set(this, "");
        _Logger_roomLink.set(this, "");
        __classPrivateFieldSet(this, _Logger_config, config, "f");
    }
    start(label, payload) {
        __classPrivateFieldGet(this, _Logger_instances, "m", _Logger_addStackItem).call(this, undefined, `${START_DEFAULT_MESSAGE} ${label ? `"${label}"` : ""}`, payload, "LOGGER_START");
        process.stdout.write("\x1B[?25l");
        readline_1.default.cursorTo(process.stdout, 0, 0);
        setInterval(() => {
            console.clear();
            const char = spinner.frames[__classPrivateFieldGet(this, _Logger_spinnerIndex, "f")];
            __classPrivateFieldSet(this, _Logger_spinnerIndex, __classPrivateFieldGet(this, _Logger_spinnerIndex, "f") + (__classPrivateFieldGet(this, _Logger_spinnerIndex, "f") === spinner.frames.length - 1
                ? -(spinner.frames.length - 1)
                : 1), "f");
            __classPrivateFieldSet(this, _Logger_loadingSpinner, char, "f");
            __classPrivateFieldGet(this, _Logger_stackItems, "f").forEach((stackItem) => __classPrivateFieldGet(this, _Logger_instances, "m", _Logger_printLog).call(this, stackItem));
        }, 200);
    }
    log(message = "", payload) {
        __classPrivateFieldGet(this, _Logger_instances, "m", _Logger_addStackItem).call(this, undefined, message, payload);
    }
    step(identifier, label, payload) {
        __classPrivateFieldGet(this, _Logger_instances, "m", _Logger_addStackItem).call(this, identifier, label, payload);
    }
    endStep(identifier, payload) {
        var _a;
        const stackItem = __classPrivateFieldGet(this, _Logger_instances, "m", _Logger_find).call(this, identifier);
        if (!stackItem)
            return;
        const currentHRTime = process.hrtime((_a = __classPrivateFieldGet(this, _Logger_instances, "a", _Logger_firstStackItem_get)) === null || _a === void 0 ? void 0 : _a.hrtime);
        const timestamp = __classPrivateFieldGet(this, _Logger_instances, "m", _Logger_convertHRTimeToTimestamp).call(this, currentHRTime);
        stackItem.executionTime = timestamp - stackItem.timestamp;
        stackItem.endTimestamp = timestamp;
        stackItem.finalPayload = payload;
        __classPrivateFieldGet(this, _Logger_instances, "m", _Logger_closeStep).call(this, stackItem);
    }
    finish(message = FINISH_DEFAULT_MESSAGE, payload) {
        __classPrivateFieldGet(this, _Logger_instances, "m", _Logger_addStackItem).call(this, undefined, message, payload, "LOGGER_FINISH");
        __classPrivateFieldGet(this, _Logger_instances, "m", _Logger_finishAll).call(this);
        __classPrivateFieldSet(this, _Logger_executionTime, __classPrivateFieldGet(this, _Logger_instances, "a", _Logger_lastStackItem_get).timestamp, "f");
        const contentToExternalView = {
            title: "Olá, mundo",
            executionTime: __classPrivateFieldGet(this, _Logger_executionTime, "f"),
            stackItems: __classPrivateFieldGet(this, _Logger_stackItems, "f"),
        };
        axios_1.default
            .post("https://stackwise.up.railway.app/api/room", contentToExternalView)
            .then(({ data }) => {
            const { code } = data;
            __classPrivateFieldSet(this, _Logger_roomLink, `http://stackwise.app/room/${code}`, "f");
        })
            .catch((er) => {
            console.log("Error", er);
        });
    }
}
exports.Logger = Logger;
_Logger_config = new WeakMap(), _Logger_stackItems = new WeakMap(), _Logger_executionTime = new WeakMap(), _Logger_terminalInterval = new WeakMap(), _Logger_spinnerIndex = new WeakMap(), _Logger_loadingSpinner = new WeakMap(), _Logger_roomLink = new WeakMap(), _Logger_instances = new WeakSet(), _Logger_colored = function _Logger_colored(text, color) {
    return `${ASCII[color]}${text}${ASCII.RESET}`;
}, _Logger_closeStep = function _Logger_closeStep(stackItem) {
    var _a;
    stackItem.opened = false;
    const currentHRTime = process.hrtime((_a = __classPrivateFieldGet(this, _Logger_instances, "a", _Logger_firstStackItem_get)) === null || _a === void 0 ? void 0 : _a.hrtime);
    const timestamp = __classPrivateFieldGet(this, _Logger_instances, "m", _Logger_convertHRTimeToTimestamp).call(this, currentHRTime);
    __classPrivateFieldGet(this, _Logger_stackItems, "f").push(Object.assign(Object.assign({}, stackItem), { type: "STEP_END", timestamp: timestamp }));
}, _Logger_getStackItemIndex = function _Logger_getStackItemIndex(stackItem) {
    return stackItem.index;
}, _Logger_finishAll = function _Logger_finishAll() {
    __classPrivateFieldGet(this, _Logger_stackItems, "f")
        .filter((stackItem) => stackItem.type === "STEP")
        .forEach((stackItem) => {
        if (stackItem.opened)
            __classPrivateFieldGet(this, _Logger_instances, "m", _Logger_closeStep).call(this, stackItem);
    });
}, _Logger_lastStackItem_get = function _Logger_lastStackItem_get() {
    return __classPrivateFieldGet(this, _Logger_stackItems, "f")[__classPrivateFieldGet(this, _Logger_stackItems, "f").length - 1];
}, _Logger_firstStackItem_get = function _Logger_firstStackItem_get() {
    return __classPrivateFieldGet(this, _Logger_stackItems, "f")[0];
}, _Logger_convertHRTimeToTimestamp = function _Logger_convertHRTimeToTimestamp(hrtime) {
    return hrtime[0] * 1000 + hrtime[1] / 1000000;
}, _Logger_convertTimestampToSeconds = function _Logger_convertTimestampToSeconds(timestamp) {
    return __classPrivateFieldGet(this, _Logger_instances, "m", _Logger_formatSeconds).call(this, timestamp / 1000);
}, _Logger_formatSeconds = function _Logger_formatSeconds(seconds) {
    return seconds.toFixed(2);
}, _Logger_find = function _Logger_find(identifier) {
    if (!identifier)
        return;
    return __classPrivateFieldGet(this, _Logger_stackItems, "f").find((stackItem) => stackItem.identifier === identifier);
}, _Logger_addStackItem = function _Logger_addStackItem(identifier, message, payload, type) {
    var _a;
    const currentHRTime = process.hrtime((_a = __classPrivateFieldGet(this, _Logger_instances, "a", _Logger_firstStackItem_get)) === null || _a === void 0 ? void 0 : _a.hrtime);
    const timestamp = __classPrivateFieldGet(this, _Logger_instances, "m", _Logger_convertHRTimeToTimestamp).call(this, currentHRTime);
    const parentStackItem = __classPrivateFieldGet(this, _Logger_instances, "m", _Logger_getParentStackItem).call(this);
    const lastRelativeStackItem = parentStackItem
        ? [...__classPrivateFieldGet(this, _Logger_stackItems, "f")]
            .reverse()
            .find((x) => x.parentStackItem === parentStackItem)
        : [...__classPrivateFieldGet(this, _Logger_stackItems, "f")].reverse().find((x) => !x.parentStackItem);
    const newStackItem = {
        index: identifier
            ? lastRelativeStackItem
                ? (lastRelativeStackItem === null || lastRelativeStackItem === void 0 ? void 0 : lastRelativeStackItem.index) + 1
                : 0
            : -1,
        type: type || (identifier ? "STEP" : "LOG"),
        parentStackItem: __classPrivateFieldGet(this, _Logger_instances, "m", _Logger_getParentStackItem).call(this),
        opened: identifier ? true : false,
        identifier: identifier,
        message: message || "",
        timestamp: __classPrivateFieldGet(this, _Logger_instances, "a", _Logger_firstStackItem_get) ? timestamp : 0,
        hrtime: currentHRTime,
    };
    __classPrivateFieldGet(this, _Logger_stackItems, "f").push(newStackItem);
}, _Logger_getParentStackItem = function _Logger_getParentStackItem() {
    return [...__classPrivateFieldGet(this, _Logger_stackItems, "f")]
        .reverse()
        .find((stackItem) => stackItem.opened);
}, _Logger_getStackItemIndexedAddress = function _Logger_getStackItemIndexedAddress(stackItem) {
    return [
        ...(stackItem.parentStackItem
            ? __classPrivateFieldGet(this, _Logger_instances, "m", _Logger_getStackItemIndexedAddress).call(this, stackItem.parentStackItem)
            : []),
        __classPrivateFieldGet(this, _Logger_instances, "m", _Logger_getStackItemIndex).call(this, stackItem),
    ];
}, _Logger_getStackItemLevel = function _Logger_getStackItemLevel(stackItem) {
    return __classPrivateFieldGet(this, _Logger_instances, "m", _Logger_getStackItemIndexedAddress).call(this, stackItem)
        .map((index) => index + 1)
        .join(".");
}, _Logger_printLog = function _Logger_printLog(stackItem) {
    var _a;
    if (!((_a = __classPrivateFieldGet(this, _Logger_config, "f")) === null || _a === void 0 ? void 0 : _a.silent)) {
        process.stdout.write(__classPrivateFieldGet(this, _Logger_instances, "m", _Logger_colored).call(this, __classPrivateFieldGet(this, _Logger_instances, "m", _Logger_formatStackItemLog).call(this, stackItem), "WHITE"));
        // break line
        process.stdout.write("\n");
    }
}, _Logger_formatStackItemLevelIndicator = function _Logger_formatStackItemLevelIndicator(stackItem) {
    return stackItem.index !== -1
        ? __classPrivateFieldGet(this, _Logger_instances, "m", _Logger_getStackItemLevel).call(this, stackItem)
        : stackItem.parentStackItem
            ? `${__classPrivateFieldGet(this, _Logger_instances, "m", _Logger_getStackItemLevel).call(this, stackItem.parentStackItem).toString()}.i`
            : "i";
}, _Logger_formatStackItemLog = function _Logger_formatStackItemLog(stackItem) {
    const levelIndicator = `(${stackItem.type === "STEP_END" ? "$" : ""}${__classPrivateFieldGet(this, _Logger_instances, "m", _Logger_formatStackItemLevelIndicator).call(this, stackItem)})`;
    const formattedExecutionTime = __classPrivateFieldGet(this, _Logger_instances, "m", _Logger_convertTimestampToSeconds).call(this, stackItem.executionTime || 0);
    const formattedTimestamp = __classPrivateFieldGet(this, _Logger_instances, "m", _Logger_convertTimestampToSeconds).call(this, stackItem.timestamp || 0);
    const deltaIndicator = stackItem.type === "STEP_END" ? `(▲ ${formattedExecutionTime}s)` : "";
    const finishIndicator = __classPrivateFieldGet(this, _Logger_instances, "m", _Logger_colored).call(this, "✓", "GREEN");
    const endIndicator = stackItem.type === "STEP_END" ? " ended" : "";
    const executionIndicator = stackItem.type === "STEP"
        ? stackItem.opened
            ? `${__classPrivateFieldGet(this, _Logger_loadingSpinner, "f")}`
            : finishIndicator
        : "";
    const mustBreakLine = ["STEP_END", "LOGGER_START", "LOG"].includes(stackItem.type) &&
        !stackItem.parentStackItem;
    return __classPrivateFieldGet(this, _Logger_instances, "m", _Logger_colored).call(this, `${levelIndicator} (${formattedTimestamp}s) ${stackItem.message}${endIndicator} ${deltaIndicator}${executionIndicator}${mustBreakLine ? "\n" : ""}`, __classPrivateFieldGet(this, _Logger_instances, "m", _Logger_getLogColor).call(this, stackItem));
}, _Logger_getLogColor = function _Logger_getLogColor(stackItem) {
    return TYPE_COLOR_MAPPING[stackItem.type];
};

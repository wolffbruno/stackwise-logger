import axios from "axios";
import { type } from "os";
import rdl from "readline";

const START_DEFAULT_MESSAGE = "Initialing";
const FINISH_DEFAULT_MESSAGE = "Finishing";

type StackItemType =
	| "LOG"
	| "STEP"
	| "STEP_END"
	| "LOGGER_START"
	| "LOGGER_FINISH";

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

const TYPE_COLOR_MAPPING: {
	[key: string]: keyof typeof ASCII;
} = {
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
	#config?: LoggerConfig;
	#stackItems: LogStackItem[] = [];
	#executionTime: number = 0;
	#terminalInterval?: NodeJS.Timer;
	#spinnerIndex: number = 0;
	#loadingSpinner: string = "";
	#roomLink?: string = "";

	constructor(config?: LoggerConfig) {
		this.#config = config;
	}

	start(label?: string, payload?: Object) {
		this.#addStackItem(
			undefined,
			`${START_DEFAULT_MESSAGE} ${label ? `"${label}"` : ""}`,
			payload,
			"LOGGER_START",
		);

		process.stdout.write("\x1B[?25l");
		rdl.cursorTo(process.stdout, 0, 0);
		setInterval(() => {
			console.clear();

			const char = spinner.frames[this.#spinnerIndex];
			this.#spinnerIndex +=
				this.#spinnerIndex === spinner.frames.length - 1
					? -(spinner.frames.length - 1)
					: 1;

			this.#loadingSpinner = char;

			this.#stackItems.forEach((stackItem) => this.#printLog(stackItem));
		}, 200);
	}

	log(message = "", payload?: Object) {
		this.#addStackItem(undefined, message, payload);
	}

	step(identifier: string | number, label?: string, payload?: Object) {
		this.#addStackItem(identifier, label, payload);
	}

	#colored(text: string, color: keyof typeof ASCII) {
		return `${ASCII[color]}${text}${ASCII.RESET}`;
	}

	endStep(identifier: string | number, payload?: Object) {
		const stackItem = this.#find(identifier);

		if (!stackItem) return;

		const currentHRTime = process.hrtime(this.#firstStackItem?.hrtime);
		const timestamp = this.#convertHRTimeToTimestamp(currentHRTime);

		stackItem.executionTime = timestamp - stackItem.timestamp;
		stackItem.endTimestamp = timestamp;
		stackItem.finalPayload = payload;

		this.#closeStep(stackItem);
	}

	#closeStep(stackItem: LogStackItem) {
		stackItem.opened = false;

		const currentHRTime = process.hrtime(this.#firstStackItem?.hrtime);
		const timestamp = this.#convertHRTimeToTimestamp(currentHRTime);

		this.#stackItems.push({
			...stackItem,
			type: "STEP_END",
			timestamp: timestamp,
		});
	}

	#getStackItemIndex(stackItem: LogStackItem) {
		return stackItem.index;
	}

	#finishAll() {
		this.#stackItems
			.filter((stackItem) => stackItem.type === "STEP")
			.forEach((stackItem) => {
				if (stackItem.opened) this.#closeStep(stackItem);
			});
	}

	finish(message = FINISH_DEFAULT_MESSAGE, payload?: Object) {
		this.#addStackItem(undefined, message, payload, "LOGGER_FINISH");

		this.#finishAll();

		this.#executionTime = this.#lastStackItem.timestamp;

		const contentToExternalView = {
			title: "Olá, mundo",
			executionTime: this.#executionTime,
			stackItems: this.#stackItems,
		};

		axios
			.post("https://stackwise.up.railway.app/api/room", contentToExternalView)
			.then(({ data }) => {
				const { code } = data;

				this.#roomLink = `http://stackwise.app/room/${code}`;
			})
			.catch((er) => {
				console.log("Error", er);
			});
	}

	get #lastStackItem(): LogStackItem {
		return this.#stackItems[this.#stackItems.length - 1];
	}

	get #firstStackItem(): LogStackItem {
		return this.#stackItems[0];
	}

	#convertHRTimeToTimestamp(hrtime: [number, number]) {
		return hrtime[0] * 1000 + hrtime[1] / 1000000;
	}

	#convertTimestampToSeconds(timestamp: number) {
		return this.#formatSeconds(timestamp / 1000);
	}

	#formatSeconds(seconds: number) {
		return seconds.toFixed(2);
	}

	#find(identifier: string | number) {
		if (!identifier) return;

		return this.#stackItems.find(
			(stackItem) => stackItem.identifier === identifier,
		);
	}

	#addStackItem(
		identifier?: string | number,
		message?: string,
		payload?: Object,
		type?: StackItemType,
	) {
		const currentHRTime = process.hrtime(this.#firstStackItem?.hrtime);
		const timestamp = this.#convertHRTimeToTimestamp(currentHRTime);

		const parentStackItem = this.#getParentStackItem();

		const lastRelativeStackItem = parentStackItem
			? [...this.#stackItems]
					.reverse()
					.find((x) => x.parentStackItem === parentStackItem)
			: [...this.#stackItems].reverse().find((x) => !x.parentStackItem);

		const newStackItem: LogStackItem = {
			index: identifier
				? lastRelativeStackItem
					? lastRelativeStackItem?.index + 1
					: 0
				: -1,
			type: type || (identifier ? "STEP" : "LOG"),
			parentStackItem: this.#getParentStackItem(),
			opened: identifier ? true : false,
			identifier: identifier,
			message: message || "",
			timestamp: this.#firstStackItem ? timestamp : 0,
			hrtime: currentHRTime,
		};

		this.#stackItems.push(newStackItem);
	}

	#getParentStackItem() {
		return [...this.#stackItems]
			.reverse()
			.find((stackItem) => stackItem.opened);
	}

	#getStackItemIndexedAddress(stackItem: LogStackItem): number[] {
		return [
			...(stackItem.parentStackItem
				? this.#getStackItemIndexedAddress(stackItem.parentStackItem)
				: []),
			this.#getStackItemIndex(stackItem),
		];
	}

	#getStackItemLevel(stackItem: LogStackItem) {
		return this.#getStackItemIndexedAddress(stackItem)
			.map((index) => index + 1)
			.join(".");
	}

	#printLog(stackItem: LogStackItem) {
		if (!this.#config?.silent) {
			process.stdout.write(
				this.#colored(this.#formatStackItemLog(stackItem), "WHITE"),
			);
			// break line
			process.stdout.write("\n");
		}
	}

	#formatStackItemLevelIndicator(stackItem: LogStackItem) {
		return stackItem.index !== -1
			? this.#getStackItemLevel(stackItem)
			: stackItem.parentStackItem
			? `${this.#getStackItemLevel(stackItem.parentStackItem).toString()}.i`
			: "i";
	}

	#formatStackItemLog(stackItem: LogStackItem): string {
		const levelIndicator = `(${
			stackItem.type === "STEP_END" ? "$" : ""
		}${this.#formatStackItemLevelIndicator(stackItem)})`;

		const formattedExecutionTime = this.#convertTimestampToSeconds(
			stackItem.executionTime || 0,
		);

		const formattedTimestamp = this.#convertTimestampToSeconds(
			stackItem.timestamp || 0,
		);

		const deltaIndicator =
			stackItem.type === "STEP_END" ? `(▲ ${formattedExecutionTime}s)` : "";

		const finishIndicator = this.#colored("✓", "GREEN");
		const endIndicator = stackItem.type === "STEP_END" ? " ended" : "";

		const executionIndicator =
			stackItem.type === "STEP"
				? stackItem.opened
					? `${this.#loadingSpinner}`
					: finishIndicator
				: "";

		const mustBreakLine =
			["STEP_END", "LOGGER_START", "LOG"].includes(stackItem.type) &&
			!stackItem.parentStackItem;

		return this.#colored(
			`${levelIndicator} (${formattedTimestamp}s) ${
				stackItem.message
			}${endIndicator} ${deltaIndicator}${executionIndicator}${
				mustBreakLine ? "\n" : ""
			}`,
			this.#getLogColor(stackItem),
		);
	}

	#getLogColor(stackItem: LogStackItem): keyof typeof ASCII {
		return TYPE_COLOR_MAPPING[stackItem.type];
	}
}

type LoggerConfig = {
	silent: boolean;
};

type LogStackItem = {
	parentStackItem?: LogStackItem;
	index: number;
	type: StackItemType;
	hrtime: [number, number];

	identifier?: string | number;
	message: string;

	timestamp: number;
	endTimestamp?: number;
	executionTime?: number;

	payload?: Object;
	finalPayload?: Object;

	opened: boolean;
};

export { Logger };

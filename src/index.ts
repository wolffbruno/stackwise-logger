import axios from "axios";
import { stdout } from "process";
import rdl from "readline";
import restoreCursor from "restore-cursor";

const START_DEFAULT_MESSAGE = "Iniciando";
const FINISH_DEFAULT_MESSAGE = "Finalizando";

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

const spinner = {
	interval: 80,
	frames: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
};

class Logger {
	config?: LoggerConfig;
	stackItems: LogStackItem[] = [];
	executionTime: number = 0;
	terminalInterval?: NodeJS.Timer;
	spinnerIndex: number = 0;

	constructor(config?: LoggerConfig) {
		this.config = config;
	}

	start(message = START_DEFAULT_MESSAGE, payload?: Object) {
		this.#addStackItem(undefined, message, payload);

		setInterval(() => {
			const char = spinner.frames[this.spinnerIndex];
			this.spinnerIndex +=
				this.spinnerIndex === spinner.frames.length - 1
					? -(spinner.frames.length - 1)
					: 1;

			console.clear();
			process.stderr.write("\u001B[?25l");
			console.info(char, " Loading");
		}, spinner.interval);
	}

	log(message = "", payload?: Object) {
		this.#addStackItem(undefined, message, payload);
	}

	step(identifier: string, payload?: Object) {
		this.#addStackItem(identifier, "", payload);
	}

	#colored(text: string, color: keyof typeof ASCII) {
		return `${ASCII[color]}${text}${ASCII.RESET}`;
	}

	endStep(identifier: string, payload?: Object) {
		const stackItem = this.find(identifier);

		if (!stackItem) return;

		const currentHRTime = process.hrtime(this.firstStackItem?.hrtime);
		const timestamp = this.convertHRTimeToTimestamp(currentHRTime);

		stackItem.executionTime = timestamp - stackItem.timestamp;
		stackItem.endTimestamp = timestamp;
		stackItem.finalPayload = payload;

		this.#closeStep(stackItem);
	}

	#closeStep(stackItem: LogStackItem) {
		stackItem.opened = false;
	}

	#getStackItemIndex(stackItem: LogStackItem) {
		return stackItem.index;
	}

	finish(message = FINISH_DEFAULT_MESSAGE, payload?: Object) {
		this.#addStackItem(undefined, message, payload);
		this.executionTime = this.stackItems.reduce(
			(sum, next) => sum + (next?.deltaSeconds || 0),
			0,
		);

		const contentToExternalView = {
			title: "Olá, mundo",
			executionTime: this.executionTime,
			stackItems: this.stackItems,
		};

		axios
			.post("https://stackwise.up.railway.app/api/room", contentToExternalView)
			.then(({ data }) => {
				const { code } = data;

				/* console.log(
					`\nSee on stackwise: ${this.#colored(
						`http://localhost:5173/${code}`,
						"MAGENTA",
					)}\n`,
				); */
			})
			.catch((er) => {
				console.log("Error", er);
			});
	}

	get lastStackItem(): LogStackItem {
		return this.stackItems[this.stackItems.length - 1];
	}

	get firstStackItem(): LogStackItem {
		return this.stackItems[0];
	}

	convertHRTimeToTimestamp(hrtime: [number, number]) {
		return hrtime[0] * 1000 + hrtime[1] / 1000000;
	}

	convertTimestampToSeconds(timestamp: number) {
		return this.formatSeconds(timestamp / 1000);
	}

	formatSeconds(seconds: number) {
		return parseFloat(seconds.toFixed(2));
	}

	find(identifier: string) {
		if (!identifier) return;

		return this.stackItems.find(
			(stackItem) => stackItem.identifier === identifier,
		);
	}

	#addStackItem(identifier?: string, message?: string, payload?: Object) {
		const currentHRTime = process.hrtime(this.firstStackItem?.hrtime);
		const timestamp = this.convertHRTimeToTimestamp(currentHRTime);

		const parentStackItem = this.#getParentStackItem();

		const lastRelativeStackItem = parentStackItem
			? [...this.stackItems]
					.reverse()
					.find((x) => x.parentStackItem === parentStackItem)
			: [...this.stackItems].reverse().find((x) => !x.parentStackItem);

		const newStackItem: LogStackItem = {
			index: identifier
				? lastRelativeStackItem
					? lastRelativeStackItem?.index + 1
					: 0
				: -1,
			type: identifier ? "STEP" : "LOG",
			parentStackItem: this.#getParentStackItem(),
			opened: identifier ? true : false,
			identifier: identifier,
			message: message || "",
			timestamp: this.firstStackItem ? timestamp : 0,
			hrtime: currentHRTime,
			// TODO: Refatorar \/
			deltaSeconds: this.firstStackItem
				? this.formatSeconds(
						this.convertTimestampToSeconds(timestamp) -
							(this.lastStackItem?.seconds || 0),
				  )
				: 0,
			seconds: this.firstStackItem
				? this.convertTimestampToSeconds(timestamp)
				: 0,
		};

		this.stackItems.push(newStackItem);
	}

	#getParentStackItem() {
		return [...this.stackItems].reverse().find((stackItem) => stackItem.opened);
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
		if (!this.config?.silent) {
			const logFunction =
				stackItem?.type === "STEP" && stackItem?.opened
					? console.log
					: console.log;
			logFunction(this.#colored(this.formatStackItemLog(stackItem), "WHITE"));
		}
	}

	formatStackItemLog(stackItem: LogStackItem) {
		const index =
			stackItem.index !== -1
				? this.#getStackItemLevel(stackItem)
				: stackItem.parentStackItem
				? `${this.#getStackItemLevel(stackItem.parentStackItem).toString()}.i`
				: "i";

		if (stackItem.executionTime) {
			return this.#colored(
				`($${index}) ${this.#colored(
					`(${this.formatSeconds(
						(stackItem?.seconds || 0) + stackItem.executionTime / 1000,
					)})`,
					"MAGENTA",
				)} Finalizando a etapa ${this.#colored(
					`"${stackItem.identifier}"`,
					"YELLOW",
				)} ${this.#colored(
					`(Σ ${this.formatSeconds(stackItem.executionTime / 1000)}s)`,
					"MAGENTA",
				)}`,
				"MAGENTA",
			);
		}

		if (stackItem.opened) {
			return this.#colored(
				`(${index}) ${this.#colored(
					`(${stackItem.seconds}s)`,
					"MAGENTA",
				)} Iniciando a etapa ${this.#colored(
					`"${stackItem.identifier}"`,
					"YELLOW",
				)}`,
				"MAGENTA",
			);
		}

		return this.#colored(
			`${this.#colored(
				`(${index}) (${stackItem.seconds}s) ${stackItem.message}`,
				"BLACK",
			)}`,
			"WHITE",
		);
	}
}

const logger = new Logger();

type LoggerConfig = {
	silent: boolean;
};

type LogStackItem = {
	index: number;
	type: "LOG" | "STEP";
	identifier?: string;
	executionTime?: number;
	timestamp: number;
	endTimestamp?: number;
	message: string;
	hrtime: [number, number];
	seconds?: number;
	deltaSeconds?: number;
	payload?: Object;
	finalPayload?: Object;
	opened: boolean;
	parentStackItem?: LogStackItem;
};

const sleep = (time: number) =>
	new Promise((r) =>
		setTimeout(() => {
			r(123);
		}, time),
	);

const a = () =>
	new Promise(async (resolve) => {
		logger.start("teste");

		logger.step("pai do 124");
		logger.log("ol124");
		logger.endStep("pai do 124");

		logger.finish();
		resolve(124);
	});

const promises = [a()];

export { Logger };

declare class Logger {
    #private;
    constructor(config?: LoggerConfig);
    start(label?: string, payload?: Object): void;
    log(message?: string, payload?: Object): void;
    step(identifier: string | number, label?: string, payload?: Object): void;
    endStep(identifier: string | number, payload?: Object): void;
    finish(message?: string, payload?: Object): void;
}
type LoggerConfig = {
    silent: boolean;
};
export { Logger };

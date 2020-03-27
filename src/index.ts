export type Subscriber<T> = ((data: T) => void) | Emitter;
export type Processor<T> = (data: any) => T | Promise<T>;
export type ReduceFunction<A=any, B=any> = (accumulatorData: B, itemData: A) => B;
export type FilterFunction<T=any> = (data: T) => boolean;
export type MappingFunction<A=any, B=any> = (data: A) => B;

export interface IntervalData {
  /** The number of times the interval has called */
  times: number;
  /** The delay time (ms) before the first call of interval */
  delay: number;
  /** The interval time (ms) between calls */
  interval: number;
  /** The maximum number of times of interval can be called */
  maxTimes: number;
}

export type IntervalCallback = (data: IntervalData) => void;

export class Emitter<T=any> {
  private subscriptions: Set<Subscriber<T>> = new Set();

  /**
   * Create a new Emitter instance
   * @param processor The *Processor* function that can convert data before the emission
   */
  constructor (private processor: Processor<T> = (data: T): T => data) {}

  /**
   * Add the passed {@link Subscriber} to the list of subscriptions that can receive the propagated data
   * @param subscriber The *Subscriber* to add
   */
  subscribe (subscriber: Subscriber<T>): void {
    this.subscriptions.add(subscriber);
  }

  /**
   * Remove the passed {@link Subscriber} from the list of subscriptions
   * @param subscriberThe *Subscriber* to remove
   */
  unsubscribe (subscriber: Subscriber<T>): void {
    this.subscriptions.delete(subscriber);
  }

  /**
   * Check if the passed {@link Subscriber} is member of the list of subscriptions
   * @param subscriber The *Subscriber* to verify
   */
  subscribed (subscriber: Subscriber<T>): boolean {
    return this.subscriptions.has(subscriber);
  }

  subscribeTo (emitter: Emitter<T>): void {
    return emitter.subscribe(this);
  }

  /**
   * Generate a new Promise that receive the next propagated data from the emitter
   */
  promise (): Promise<T> {
    return new Promise(resolve => {
      const fn = (data: T): void => {
        this.unsubscribe(fn);
        resolve(data);
      };
      this.subscribe(fn);
    });
  }

  private async prepareData (data: any): Promise<T> {
    let processedData = this.processor(data);
    if(processedData instanceof Promise) {
      processedData = await processedData;
    }
    return processedData;
  }

  /**
   * Emit data to the attached subscribers
   * @param data Data to propagate trough the attached subscribers
   */
  async emit (data: T = null): Promise<void> {
    const processedData = await this.prepareData(data);
    for(const sub of this.subscriptions) {
      if(sub instanceof Emitter) {
        sub.emit(processedData);
      } else if(typeof sub === "function") {
        sub.call(this, processedData);
      }
    }
  }

  /**
   * Emit a series of data values to the attached subscribers
   * @param dataList An array of data values to emit singularly
   */
  async emitAll (dataList: T[]): Promise<void> {
    for(const data of dataList) {
      await this.emit(data);
    }
  }

  private tou: number;
  private itv: number;
  private itvFn: IntervalCallback

  // TODO: docs
  setIntervalCallback (callback: IntervalCallback): void {
    this.itvFn = callback;
  }

  // TODO: docs
  startInterval (delay: number, interval: number, maxTimes: number = 0): void {
    let times = 0;

    this.tou = window.setTimeout(() => {
      times++;
      this.itvFn({
        times,
        delay,
        interval,
        maxTimes
      });

      if(maxTimes > 0 && maxTimes === times) {
        return;
      }

      this.itv = window.setInterval(() => {
        times++;
        this.itvFn({
          times,
          delay,
          interval,
          maxTimes
        });

        if(maxTimes > 0 && maxTimes === times) {
          this.stopInterval();
        }
      }, interval);
    }, delay);
  }

  /**
   * Stop previously started interval emitter
   */
  stopInterval (): void {
    if(this.tou) {
      window.clearTimeout(this.tou);
      this.tou = null;
    }

    if(this.itv) {
      window.clearInterval(this.itv);
      this.itv = null;
    }
  }

  /**
   * Generate a new {@link Emitter} that receive data filtered by a filter function
   * @param filterFn {@link FilterFunction} that discriminate the data to propagate
   */
  filter (filterFn: FilterFunction<T>): Emitter<T> {
    const emitter = new Emitter<T>();

    this.subscribe((data: T) => {
      if(filterFn(data)) {
        emitter.emit(data);
      }
    });

    return emitter;
  }

  /**
   * Generate a new {@link Emitter} that receive data transformed by a mapping function
   * @param mapFn {@link MappingFunction} function that return the new data to propagate
   */
  map<R=any> (mapFn: MappingFunction<T, R>): Emitter<R> {
    const emitter = new Emitter<R>();

    this.subscribe((data: T): void => {
      const newData = mapFn(data) as R;
      emitter.emit(newData);
    });

    return emitter;
  }

  /**
   * Generate a new {@link Emitter} that receive data accumulated by a reduce function
   * @param reduceFn {@link ReduceFunction} that return new accumulated data
   * @param accumulatorData Data to use as initial basis for accumulated data
   */
  reduce<R> (
    reduceFn: ReduceFunction<T, R>,
    accumulatorData: any
  ): Emitter<R> {
    const emitter = new Emitter<R>();

    this.subscribe((data: any) => {
      const newData = reduceFn(accumulatorData, data) as R;
      accumulatorData = newData;
      emitter.emit(newData);
    });

    return emitter;
  }

  /**
   * Generate a new {@link Emitter} that receive data after a delay time
   * @param delay The delay time (ms) before the data will be propagated
   */
  delay (delay: number): Emitter<T> {
    const emitter = new Emitter<T>();

    this.subscribe((data: any) => {
      setTimeout(() => emitter.emit(data), delay);
    });

    return emitter;
  }

  /**
   * Generate a new {@link Emitter} that receive data one time after the *releaseEmitter* has released the propagation
   * @param releaseEmitter {@link Emitter} that permit the propagation
   */
  debounce (releaseEmitter: Emitter): Emitter<T> {
    const emitter = new Emitter<T>();
    let ok: boolean = false;

    this.subscribe((data: any) => {
      if(ok) {
        emitter.emit(data);
        ok = false;
      }
    });

    releaseEmitter.subscribe(() => {
      ok = true;
    });

    return emitter;
  }

  /**
   * Generate a new {@link Emitter} that receive data one time after a predefined time
   * @param time Time (ms) to wait before next propagation
   */
  debounceTime (time: number): Emitter<T> {
    const emitter = new Emitter<T>();
    let ok: boolean = false;
    let emitterTO: any;

    this.subscribe((data: any) => {
      if(ok) {
        emitter.emit(data);
        ok = false;
      }

      clearTimeout(emitterTO);

      emitterTO = setTimeout(() => (ok = true), time);
    });

    return emitter;
  }

  /**
   * Generate a new {@link Emitter} that receive latest data collected when a *releaseEmitter* has released the propagation
   * @param releaseEmitter {@link Emitter} that permit the propagation
   */
  audit (releaseEmitter: Emitter): Emitter<T> {
    const emitter = new Emitter<T>();
    let lastData: any = null;

    this.subscribe((data: any) => {
      lastData = data;
    });

    releaseEmitter.subscribe(() => {
      emitter.emit(lastData);
    });

    return emitter;
  }

  /**
   * Generate a new {@link Emitter} that receive latest data collected if a predefine time is elapsed without new propagation
   * @param time Time (ms) to wait for the data propagation
   */
  auditTime (time: number): Emitter<T> {
    const emitter = new Emitter<T>();
    let lastData: any = undefined;
    let emitterTO: any;

    this.subscribe((data: any) => {
      lastData = data;

      clearTimeout(emitterTO);

      emitterTO = setTimeout(() => {
        if(lastData !== undefined) {
          emitter.emit(lastData);
        }
      }, time);
    });

    return emitter;
  }

  /**
   * Generate a new {@link Emitter} that receive an array of buffered data after the *releaseEmitter* has released the propagation
   * @param releaseEmitter {@link Emitter} that permit the propagation
   */
  buffer (releaseEmitter: Emitter): Emitter<T[]> {
    const emitter = new Emitter<T[]>();
    let bufferData: T[] = [];

    this.subscribe((data: any) => {
      bufferData.push(data);
    });

    releaseEmitter.subscribe(() => {
      const outBuffer = bufferData;
      bufferData = [];
      emitter.emit(outBuffer);
    });

    return emitter;
  }

  /**
   * Generate an {@link Emitter} that emit a call when a new event is fired
   * @param $element HTML DOM node to attach the event listener
   * @param eventType Name of the event
   */
  static fromListener ($element: HTMLElement, eventType: string): Emitter<Event> {
    const emitter = new Emitter();
    $element.addEventListener(eventType, (event) => emitter.emit(event));
    return emitter;
  }

  /**
   * Generate an {@link Emitter} that emit a call when the promise resolves
   * @param promise The Promise that trigger
   */
  static fromPromise<R = any> (promise: Promise<R>): Emitter<R | Error> {
    const emitter = new Emitter<R | Error>();
    promise.then((data: R) => emitter.emit(data), (err) => err);
    return emitter;
  }

  /**
   * Generate an {@link Emitter} that emit a call to the attached subscribers with regular intervals.<br/>
   * The data propagated to the subscribers is an object {@link IntervalData} with info about the interval emission
   * @param delay The time (ms) to wait before the first emission
   * @param interval The time (ms) of interval before emissions
   * @param maxTimes (optional) If passed a value > 0, limit the number of emissions to maximum the specified value
   */
  static fromInterval (delay: number, interval: number, maxTimes: number = 0): Emitter<IntervalData> {
    const emitter = new Emitter<IntervalData>();
    emitter.setIntervalCallback((data: IntervalData) => emitter.emit(data));
    emitter.startInterval(delay, interval, maxTimes);
    return emitter;
  }
}

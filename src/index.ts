export type Subscriber = ((data: any) => void) | Emitter;
export type Processor = (data: any) => any;

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

export class Emitter {
  private subscriptions: Set<Subscriber> = new Set();

  constructor (private processor: Processor = (data: any): any => data) {}

  subscribe (subscriber: Subscriber): void {
    this.subscriptions.add(subscriber);
  }

  unsubscribe (subscriber: Subscriber): void {
    this.subscriptions.delete(subscriber);
  }

  subscribed (subscriber: Subscriber): boolean {
    return this.subscriptions.has(subscriber);
  }

  subscribeTo (emitter: Emitter): void {
    return emitter.subscribe(this);
  }

  promise (): Promise<any> {
    return new Promise(resolve => {
      const fn = (data: any): void => {
        this.unsubscribe(fn);

        resolve(data);
      };

      this.subscribe(fn);
    });
  }

  private async prepareData (data: any): Promise<any> {
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
  async emit (data: any = null): Promise<void> {
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
  async emitAll (dataList: any[]): Promise<void> {
    for(const data of dataList) {
      await this.emit(data);
    }
  }

  private tou: number;
  private itv: number;

  /**
   * Emit a call to the attached subscribers with regular intervals.<br/>
   * The data propagated to the subscribers is an object {@link IntervalData} with info about the interval emission
   * @param delay The time (ms) to wait before the first emission
   * @param interval The time (ms) of interval before emissions
   * @param maxTimes (optional) If passed a value > 0, limit the number of emissions to maximum the specified value
   */
  async emitInterval (
    delay: number,
    interval: number,
    maxTimes: number = 0
  ): Promise<void> {
    let times = 0;

    this.tou = window.setTimeout(() => {
      times++;
      this.emit({
        times,
        delay,
        interval,
        maxTimes
      } as IntervalData);

      if(maxTimes > 0 && maxTimes === times) {
        return;
      }

      this.itv = window.setInterval(() => {
        times++;
        this.emit({
          times,
          delay,
          interval,
          maxTimes
        } as IntervalData);

        if(maxTimes > 0 && maxTimes === times) {
          this.stopInterval();
        }
      }, interval);
    }, delay);
  }

  /**
   *
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

  filter (filterFn: (data: any) => boolean): Emitter {
    const emitter = new Emitter();

    this.subscribe((data: any) => {
      if(filterFn(data)) {
        emitter.emit(data);
      }
    });

    return emitter;
  }

  map (mapFn: (data: any) => any): Emitter {
    const emitter = new Emitter();

    this.subscribe((data: any) => {
      const newData = mapFn(data);
      emitter.emit(newData);
    });

    return emitter;
  }

  reduce (
    reduceFn: (accumData: any, itemData: any) => any,
    accumData: any
  ): Emitter {
    const emitter = new Emitter();

    this.subscribe((data: any) => {
      const newData = reduceFn(accumData, data);
      accumData = newData;
      emitter.emit(newData);
    });

    return emitter;
  }

  delay (delay: number): Emitter {
    const emitter = new Emitter();

    this.subscribe((data: any) => {
      setTimeout(() => emitter.emit(data), delay);
    });

    return emitter;
  }

  debounce (releaseEmitter: Emitter): Emitter {
    const emitter = new Emitter();
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

  debounceTime (time: number): Emitter {
    const emitter = new Emitter();
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

  audit (releaseEmitter: Emitter): Emitter {
    const emitter = new Emitter();
    let lastData: any = null;

    this.subscribe((data: any) => {
      lastData = data;
    });

    releaseEmitter.subscribe(() => {
      emitter.emit(lastData);
    });

    return emitter;
  }

  auditTime (time: number): Emitter {
    const emitter = new Emitter();
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

  buffer (releaseEmitter: Emitter): Emitter {
    const emitter = new Emitter();
    let bufferData: any[] = [];

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
}

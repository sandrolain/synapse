export type Subscriber<T> = ((data: T) => void) | Emitter<T>;
export type ReduceFunction<A=any, B=any> = (accumulatorData: B, itemData: A) => B;
export type FilterFunction<T=any> = (data: T) => boolean;
export type MappingFunction<A=any, B=any> = (data: A) => B;
export type BufferReleaseFunction<T=any> = (buffer: T[]) => boolean;
export type ListenerTarget = Window | Document | Element;

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


/**
 * Interface for options accepted by Emitter constructor
 */
export interface EmitterOptions {
  /** Enable the cache of emitted values. New subscribers receives the replay of previously emitted values */
  replay?: boolean;
  /** Max number of emitted values to cache.
   * After the limit is reached oldest value is dropped and newer is inserted */
  replayMax?: number;
  /** A callback executed by the start() method */
  startCallback?: () => any;
  /** A callback executed by the stop() method */
  stopCallback?: () => any;
}


/**
 * Class that represents the subscription of a *Subscriber* to an *Emitter*
 */
export class Subscription<T> {
  constructor (
    readonly emitter: Emitter<T>,
    readonly subscriber: Subscriber<T>
  ) {}

  /**
   * Allows the cancellation of the subscription
   */
  unsubscribe (): void {
    return this.emitter.unsubscribe(this.subscriber);
  }
}


/**
 * Class of the Emitter
 */
export class Emitter<T=any> {
  private subscriptions: Set<Subscriber<T>> = new Set();
  private options: EmitterOptions = {
    replay: false,
    replayMax: 0,
    startCallback: null,
    stopCallback: null
  };
  private replayCache: T[] = [];

  /**
   * Create a new Emitter instance
   */
  constructor (options: EmitterOptions = {}) {
    this.setOptions(options);
  }

  /**
   * Allows updating of the **Emitter** options
   * @param options Object with the options to update
   */
  setOptions (options: EmitterOptions = {}): void {
    Object.assign(this.options, options);
    this.updateReplayCache();
  }

  /**
   * @ignore
   */
  private updateReplayCache (): void {
    if(this.options.replayMax > 0) {
      this.replayCache = this.replayCache.slice(-this.options.replayMax);
    }
  }

  /**
   * @ignore
   */
  private getChildEmitter<R> (): Emitter<R> {
    return new Emitter({
      replay: this.options.replay,
      replayMax: this.options.replayMax
    });
  }

  /**
   * Add the passed {@link Subscriber} to the list of subscriptions that can receive the propagated data
   * @param subscriber The *Subscriber* to add
   */
  subscribe (subscriber: Subscriber<T>): Subscription<T> {
    if(subscriber === this) {
      throw new Error("Circular Reference Error: passed Subscriber cannot be the same instance of Emitter");
    }

    this.subscriptions.add(subscriber);

    for(const data of this.replayCache) {
      this.propagateEmit(subscriber, data);
    }

    return new Subscription<T>(this, subscriber);
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

  /**
   * Subscribe this *Emitter* to the passed *Emitter*
   * @param emitter The *Emitter* to subscribe in
   */
  subscribeTo (emitter: Emitter<T>): Subscription<T> {
    if(emitter === this) {
      throw new Error("Circular Reference Error: passed Emitter cannot be the same instance of Subscriber");
    }
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

  /**
   * Emit data to the attached subscribers
   * @param data Data to propagate trough the attached subscribers
   */
  async emit (data: T | Promise<T> = null): Promise<void> {
    if(data instanceof Promise) {
      data = await data;
    }
    if(this.options.replay) {
      this.replayCache.push(data);
      this.updateReplayCache();
    }
    for(const sub of this.subscriptions) {
      this.propagateEmit(sub, data);
    }
  }

  private propagateEmit (sub: Subscriber<T>, data: T): void {
    if(sub instanceof Emitter) {
      sub.emit(data);
    } else if(typeof sub === "function") {
      sub.call(this, data);
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

  /**
   * Generate a new {@link Emitter} that receive data filtered by a filter function
   * @param filterFn {@link FilterFunction} that discriminate the data to propagate
   */
  filter (filterFn: FilterFunction<T>): Emitter<T> {
    const emitter = this.getChildEmitter<T>();
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
    const emitter = this.getChildEmitter<R>();
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
    const emitter = this.getChildEmitter<R>();
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
    const emitter = this.getChildEmitter<T>();
    this.subscribe((data: any) => {
      window.setTimeout(() => emitter.emit(data), delay);
    });
    return emitter;
  }

  /**
   * Generate a new {@link Emitter} that receive data one time after the *releaseEmitter* has released the propagation
   * @param releaseEmitter {@link Emitter} that permit the propagation
   */
  audit (releaseEmitter: Emitter): Emitter<T> {
    const emitter = this.getChildEmitter<T>();
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
  auditTime (time: number): Emitter<T> {
    const emitter = this.getChildEmitter<T>();
    let ok: boolean = false;
    let emitterTO: any;
    this.subscribe((data: any) => {
      if(ok) {
        emitter.emit(data);
        ok = false;
      }
      window.clearTimeout(emitterTO);
      emitterTO = window.setTimeout(() => (ok = true), time);
    });
    emitterTO = window.setTimeout(() => (ok = true), time);
    return emitter;
  }

  /**
   * Generate a new {@link Emitter} that receive latest data collected when a *releaseEmitter* has released the propagation
   * @param releaseEmitter {@link Emitter} that permit the propagation
   */
  debounce (releaseEmitter: Emitter): Emitter<T> {
    const emitter = this.getChildEmitter<T>();
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
  debounceTime (time: number): Emitter<T> {
    const emitter = this.getChildEmitter<T>();
    let lastData: any = undefined;
    let emitterTO: any;
    this.subscribe((data: any) => {
      lastData = data;
      window.clearTimeout(emitterTO);
      emitterTO = window.setTimeout(() => {
        if(lastData !== undefined) {
          emitter.emit(lastData);
          lastData = undefined;
        }
      }, time);
    });

    return emitter;
  }

  /**
   * Generate a new {@link Emitter} that receive an array of buffered data after the *releaseEmitter* has released the propagation
   * @param releaseEmitter {@link Emitter} that permit the propagation, or releaser function called after every buffer population that release the buffer if returns true
   */
  buffer (releaser: Emitter | BufferReleaseFunction<T>): Emitter<T[]> {
    const emitter = this.getChildEmitter<T[]>();
    const releaserFunction = (typeof releaser === "function") ? releaser : null;
    let bufferData: T[] = [];
    const releaseAndReset = (): void => {
      const outBuffer = bufferData;
      bufferData = [];
      emitter.emit(outBuffer);
    };
    this.subscribe((data: any) => {
      bufferData.push(data);
      if(releaserFunction && true === releaserFunction(bufferData.slice())) {
        releaseAndReset();
      }
    });
    if(releaser instanceof Emitter) {
      releaser.subscribe(() => {
        releaseAndReset();
      });
    }
    return emitter;
  }

  /**
   * Starts data output for Emitter generated from external data sources
   */
  start (): Emitter<T> {
    if(this.options.startCallback) {
      this.options.startCallback();
    }
    return this;
  }

  /**
   * Stop data output for Emitter generated from external data sources
   */
  stop (): Emitter<T> {
    if(this.options.stopCallback) {
      this.options.stopCallback();
    }
    return this;
  }

  /**
   * Subscribes to the dispatch of a CustomEvent DOM
   * @param eventName The name of the DOM event to be dispatched
   * @param target The *Window*, *Document* or *HTMLElement* instance towards which to dispatch the event. Default: current *window*
   */
  thenDispatch (eventName: string, target: Window | Document | HTMLElement = window): Subscription<T> {
    return this.subscribe((data: T) => {
      const event = new CustomEvent(eventName, {
        detail: data,
        bubbles: true,
        cancelable: false,
        composed: true
      });
      target.dispatchEvent(event);
    });
  }
}

/**
 * Create a new *Emitter* that receives emissions from *Emitter* instances passed as arguments
 * @param args As arguments accepts *Emitter* instances from which to receive data
 */
export function merge<T=any> (...args: Emitter[]): Emitter<T> {
  const emitter = new Emitter<T>();
  const subscriptions: Subscription<T>[] = [];

  emitter.setOptions({
    startCallback: (): void => {
      for(const source of args) {
        if(!source.subscribed(emitter)) {
          subscriptions.push(source.subscribe(emitter));
        }
      }
    },
    stopCallback: (): void => {
      while(subscriptions.length > 0) {
        const subs = subscriptions.shift();
        subs.unsubscribe();
      }
    }
  });

  return emitter;
}


/**
 * Generates an {@link Emitter} that emit a call when a new event is fired<br/><br/>
 * To start listening it is necessary to execute the **start()** method of the obtained Emitter instance<br/>
 * To stop listening it is necessary to execute the **stop()** method of the obtained Emitter instance
 * @param eventType Name of the event
 * @param target Window, Document or Element node to attach the event listener
 */
export function fromListener (eventType: string, target: ListenerTarget = window): Emitter<Event> {
  const emitter = new Emitter<Event>();
  const fn = (event: Event): void => {
    emitter.emit(event);
  };
  emitter.setOptions({
    startCallback: (): void => {
      target.addEventListener(eventType, fn, true);
    },
    stopCallback: (): void => {
      target.removeEventListener(eventType, fn, true);
    }
  });
  return emitter;
}


/**
 * Generates an {@link Emitter} that emit a call when the promise resolves
 * @param promise The Promise that trigger
 */
export function fromPromise<R = any> (promise: Promise<R>): Emitter<R | Error> {
  const emitter = new Emitter<R | Error>();
  promise.then((data: R) => emitter.emit(data), (err) => err);
  return emitter;
}


/**
 * Generates an {@link Emitter} that emit a call to the attached subscribers with regular intervals.<br/>
 * The data propagated to the subscribers is an object {@link IntervalData} with info about the interval emission<br/><br/>
 * To start listening it is necessary to execute the **start()** method of the obtained Emitter instance<br/>
 * To stop listening it is necessary to execute the **stop()** method of the obtained Emitter instance
 * @param delay The time (ms) to wait before the first emission
 * @param interval The time (ms) of interval before emissions
 * @param maxTimes (optional) If passed a value > 0, limit the number of emissions to maximum the specified value
 */
export function fromInterval (delay: number, interval: number, maxTimes: number = 0): Emitter<IntervalData> {
  const emitter = new Emitter<IntervalData>();
  const itvFn   = (data: IntervalData): void => {
    emitter.emit(data);
  };

  let tou: number;
  let itv: number;

  const stopCallback = (): void => {
    if(tou) {
      window.clearTimeout(tou);
      tou = null;
    }

    if(itv) {
      window.clearInterval(itv);
      itv = null;
    }
  };

  emitter.setOptions({
    startCallback: (): void => {
      let times = 0;

      tou = window.setTimeout(() => {
        times++;
        itvFn({
          times,
          delay,
          interval,
          maxTimes
        });

        if(maxTimes <= 0 || times < maxTimes) {
          itv = window.setInterval(() => {
            times++;
            itvFn({
              times,
              delay,
              interval,
              maxTimes
            });

            if(maxTimes > 0 && maxTimes === times) {
              stopCallback();
            }
          }, interval);
        }
      }, delay);
    },
    stopCallback
  });

  return emitter;
}


/**
 * Generates an {@link Emitter} that emit at the change in the value returned by a custom callback<br/><br/>
 * To start listening it is necessary to execute the **start()** method of the obtained Emitter instance<br/>
 * To stop listening it is necessary to execute the **stop()** method of the obtained Emitter instance
 * @param observeFn The callback that return the value to observe
 * @param interval The time in milliseconds for the observation interval. Default: 500 ms
 */
export function fromObserver<T=any> (observeFn: () => T | Promise<T>, interval: number = 500): Emitter<T> {
  const emitter = new Emitter<T>();
  let lastValue: T = null;
  let intervalTO: number;
  emitter.setOptions({
    startCallback: (): void => {
      intervalTO = window.setInterval(async () => {
        let newValue = observeFn();
        if(newValue instanceof Promise) {
          newValue = await newValue;
        }
        if(newValue !== lastValue) {
          lastValue = newValue;
          emitter.emit(newValue);
        }
      }, interval);
    },
    stopCallback: (): void => {
      window.clearInterval(intervalTO);
    }
  });
  return emitter;
}


/**
 * Generates an {@link Emitter} that emit at the change in the value of an item in a Storage area<br/><br/>
 * To start listening it is necessary to execute the **start()** method of the obtained Emitter instance<br/>
 * To stop listening it is necessary to execute the **stop()** method of the obtained Emitter instance
 * @param itemName The name of the item to be observed
 * @param storageArea The LocalStorage or SessionStorage object
 * @param interval The time in milliseconds for the observation interval. Default: 500 ms
 */
export function fromStorage (itemName: string, storageArea: Storage = window.localStorage, interval: number = 500): Emitter<string> {
  return fromObserver<string>((): string => {
    return storageArea.getItem(itemName);
  }, interval);
}


/**
 * Generates an {@link Emitter} that emit at the change in the value of an cookie<br/><br/>
 * To start listening it is necessary to execute the **start()** method of the obtained Emitter instance<br/>
 * To stop listening it is necessary to execute the **stop()** method of the obtained Emitter instance
 * @param cookieName The name of the cookie to observe
 * @param interval The time in milliseconds for the observation interval. Default: 500 ms
 */
export function fromCookie (cookieName: string, interval: number = 500): Emitter<string> {
  return fromObserver<string>((): string => {
    const parts = `; ${document.cookie}`.split(`; ${cookieName}=`);
    if(parts.length === 2) {
      return parts.pop().split(";").shift();
    }
    return null;
  }, interval);
}


/**
 * Generates an {@link Emitter} that emit at the change in the value of a search param into window location<br/><br/>
 * To start listening it is necessary to execute the **start()** method of the obtained Emitter instance<br/>
 * To stop listening it is necessary to execute the **stop()** method of the obtained Emitter instance
 * @param paramName The name of the parameter to be observed
 * @param interval The time in milliseconds for the observation interval. Default: 500 ms
 */
export function fromSearchParam (paramName: string, interval: number = 500): Emitter<string> {
  return fromObserver<string>((): string => {
    const params = new URLSearchParams(window.location.search.slice(1));
    return params.get(paramName);
  }, interval);
}


/**
 * Generates an {@link Emitter} that emit upon receiving a message from a WebSocket communication<br/><br/>
 * To start listening it is necessary to execute the **start()** method of the obtained Emitter instance<br/>
 * To stop listening it is necessary to execute the **stop()** method of the obtained Emitter instance
 * @param ws The instance of *WebSocket* to notify the messages
 */
export function fromWebSocket<T=any> (ws: WebSocket): Emitter<T> {
  const emitter = new Emitter<T>();
  const fn = (event: MessageEvent): void => {
    emitter.emit(event.data as T);
  };
  emitter.setOptions({
    startCallback: (): void => {
      ws.addEventListener("message", fn);
    },
    stopCallback: (): void => {
      ws.removeEventListener("message", fn);
    }
  });
  return emitter;
}


/**
 * Generates an {@link Emitter} which makes a fetch call at regular intervals and emit the received *Response*<br/><br/>
 * To start listening it is necessary to execute the **start()** method of the obtained Emitter instance<br/>
 * To stop listening it is necessary to execute the **stop()** method of the obtained Emitter instance
 * @param interval The time in milliseconds of the polling interval for the fetch call
 * @param input The url string or *Request* instance for the fetch call
 * @param init The *RequestInit* parameters for the fetch call
 */
export function fromFetchPolling (interval: number, input: RequestInfo, init?: RequestInit): Emitter<Response> {
  const emitter = new Emitter<Response>();
  const fn = (): void => {
    emitter.emit(fetch(input, init));
  };
  let itv: number;

  emitter.setOptions({
    startCallback: (): void => {
      fn();
      itv = window.setInterval(fn, interval);
    },
    stopCallback: (): void => {
      window.clearInterval(itv);
    }
  });
  return emitter;
}

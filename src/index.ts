import { ReleaseFunction, ReleaseExecutionFunction } from "./releasers";

export type Subscriber<T> = ((data: T) => void) | Emitter<T>;
export type ReduceFunction<A=any, B=any> = (accumulatorData: B, itemData: A) => B;
export type FilterFunction<T=any> = (data: T) => boolean;
export type MappingFunction<A=any, B=any> = (data: A) => B;

type Unboxed<T> =
    T extends (infer U)[]
        ? U
        : T;

/**
 * Interface for options accepted by Emitter constructor
 */
export interface EmitterOptions {
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

    return new Subscription<T>(this, subscriber);
  }

  /**
   * Add the passed {@link Subscriber} to the list of subscriptions that can receive the propagated data and replay latest value
   * @param subscriber The *Subscriber* to add
   */
  subscribeAndReplay (subscriber: Subscriber<T>): Subscription<T> {
    const subscription = this.subscribe(subscriber);

    for(const data of this.replayCache) {
      this.propagateEmit(subscription.subscriber, data);
    }

    return subscription;
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
    this.replayCache.push(data);
    this.updateReplayCache();
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
   * Generate a new {@link Emitter} that receive the newest data one time after the *ReleaseFunction* has released the propagation
   * @param releaser {@link ReleaseFunction} called after every received data and pass a release-execution function that allow the release for the newer data
   */
  pass (releaser: ReleaseFunction<T>): Emitter<T> {
    const emitter = this.getChildEmitter<T>();
    let ok: boolean = false;
    const releaseExec: ReleaseExecutionFunction<T> = (): void => {
      ok = true;
    };
    this.subscribe((data: any) => {
      if(ok) {
        emitter.emit(data);
        ok = false;
      }
      releaser(data, releaseExec);
    });
    return emitter;
  }

  /**
   * Generate a new {@link Emitter} that receive latest data collected when a *ReleaseFunction* has released the propagation
   * @param releaser {@link ReleaseFunction} called after every received data and pass a release-execution function that release the data if invoked
   */
  wait (releaser: ReleaseFunction<T>): Emitter<T> {
    const emitter = this.getChildEmitter<T>();
    const releaseExec: ReleaseExecutionFunction<T> = (data: T): void => {
      emitter.emit(data);
    };
    this.subscribe((data: any) => {
      releaser(data, releaseExec);
    });
    return emitter;
  }

  /**
   * Generate a new {@link Emitter} that receive an array of buffered data after the *releaseEmitter* has released the propagation
   * @param releaser {@link ReleaseFunction} called after every buffer population and pass a release-execution function that release the buffer if invoked
   */
  buffer (releaser: ReleaseFunction<T[]>): Emitter<T[]> {
    const emitter = this.getChildEmitter<T[]>();
    let bufferData: T[] = [];
    const releaseExec: ReleaseExecutionFunction<T[]> = (): void => {
      const outBuffer = bufferData;
      bufferData = [];
      emitter.emit(outBuffer);
    };
    this.subscribe((data: any) => {
      bufferData.push(data);
      releaser(bufferData.slice(), releaseExec);
    });
    return emitter;
  }

  /**
   * Generate a new {@link Emitter} that receive an array of cached data with a max size specified by function argument
   * @param cacheSize The max size for output cache array (default = 1)
   */
  cache (cacheSize: number = 1): Emitter<T[]> {
    const emitter = this.getChildEmitter<T[]>();
    let cacheData: T[] = [];
    this.subscribe((data: any) => {
      cacheData.push(data);
      cacheData = cacheData.slice(-cacheSize);
      emitter.emit(cacheData);
    });
    return emitter;
  }

  /**
   * Generate a new {@link Emitter} that receive each element of source data if it is an array or the same data if not
   */
  unpack (): Emitter<Unboxed<T>> {
    const emitter = this.getChildEmitter<Unboxed<T>>();
    this.subscribe((data: T) => {
      if(data instanceof Array) {
        for(const item of data) {
          emitter.emit(item);
        }
      } else {
        emitter.emit(data as Unboxed<T>);
      }
    });
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
  dispatchEvent (eventName: string, target: Window | Document | HTMLElement = window): Subscription<T> {
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

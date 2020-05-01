import { Emitter, Subscription } from "./index";

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

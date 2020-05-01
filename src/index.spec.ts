/**
 * @jest-environment jsdom
 */

import WS from "jest-websocket-mock";
import { Emitter } from "./index";
import { IntervalData, fromInterval, fromPromise, fromListener, merge, fromStorage, fromObserver, fromCookie, fromSearchParam, fromWebSocket, fromFetchPolling } from "./initiators";
import { timeoutReleaser, ReleaseExecutionFunction } from "./releasers";

type TestData = Record<string, string>;
interface FooData {
  foo: string;
}
interface NumberData {
  value: number;
}

describe("Emitter instance", () => {

  it("check if callback is subscribed", done => {
    const emitter = new Emitter<FooData>();

    const subscriber = (data: any): void => {
      data;
    };
    const notSubscriber = (data: any): void => {
      data;
    };

    emitter.subscribe(subscriber);

    const subscribed = emitter.subscribed(subscriber);
    const notSubscribed = emitter.subscribed(notSubscriber);

    expect(subscribed).toBeTruthy();
    expect(notSubscribed).toBeFalsy();
    done();
  });

  it("subscription.unsubscribe()", done => {
    const emitter = new Emitter<FooData>();

    const subscriberCallback = (data: any): void => {
      data;
    };
    const subscriberEmitter  = new Emitter<FooData>();

    const subscriptionCallback = emitter.subscribe(subscriberCallback);
    const subscriptionEmitter  = emitter.subscribe(subscriberEmitter);

    expect(emitter.subscribed(subscriberCallback)).toBeTruthy();
    expect(emitter.subscribed(subscriberEmitter)).toBeTruthy();

    subscriptionCallback.unsubscribe();
    subscriptionEmitter.unsubscribe();

    expect(emitter.subscribed(subscriberCallback)).toBeFalsy();
    expect(emitter.subscribed(subscriberEmitter)).toBeFalsy();
    done();
  });

  it("Cannot emitter.subscribe() itself", done => {
    const emitter = new Emitter<FooData>();
    try {
      emitter.subscribe(emitter);
    } catch(e) {
      return done();
    }
    done.fail(new Error("Emitter should not subscribe to itself"));
  });

  it("Cannot emitter.subscribeTo() to itself", done => {
    const emitter = new Emitter<FooData>();
    try {
      emitter.subscribeTo(emitter);
    } catch(e) {
      return done();
    }
    done.fail(new Error("Emitter should not subscribe to itself"));
  });

  it("emit with callback", done => {
    const emitter = new Emitter<FooData>();

    emitter.subscribe(data => {
      expect(data).toMatchObject({ foo: "bar" });
      done();
    });

    emitter.emit({
      foo: "bar"
    });
  });

  it("Promise resolution before emission", done => {
    const emitter = new Emitter<FooData>();

    emitter.subscribe(data => {
      expect(data).toMatchObject({ foo: "bar" });
      done();
    });

    emitter.emit(Promise.resolve({
      foo: "bar"
    }));
  });

  it("chain emit with emitter.subscribe() into an Emitter", done => {
    const emitterA = new Emitter<FooData>();
    const emitterB = new Emitter<FooData>();

    emitterB.subscribe(data => {
      expect(data).toMatchObject({ foo: "bar" });
      done();
    });

    emitterA.subscribe(emitterB);

    emitterA.emit({
      foo: "bar"
    });
  });

  it("chain emit with emitter.subscribeTo() an Emitter", done => {
    const emitterA = new Emitter<FooData>();
    const emitterB = new Emitter<FooData>();

    emitterB.subscribe(data => {
      expect(data).toMatchObject({ foo: "bar" });
      done();
    });

    emitterB.subscribeTo(emitterA);

    emitterA.emit({
      foo: "bar"
    });
  });

  it("Emitter to promise", done => {
    const emitter = new Emitter<FooData>();

    const prom = emitter.promise();

    prom.then(data => {
      expect(data).toMatchObject({ foo: "bar" });
      done();
    });

    emitter.emit({
      foo: "bar"
    });
  });

  it("emitter.emitAll() with callback", done => {
    const emitter = new Emitter<TestData>();

    const passedData: TestData[] = [];

    emitter.subscribe(data => {
      passedData.push(data);
    });

    const prom = emitter.emitAll([
      { foo: "foo" },
      { foo: "bar" },
      { bar: "foo" }
    ]);

    prom.then(() => {
      expect(passedData.length).toEqual(3);
      expect(passedData).toMatchObject([
        { foo: "foo" },
        { foo: "bar" },
        { bar: "foo" }
      ]);
      done();
    });
  });

  it("Emitter reply cache", done => {
    const emitter = new Emitter<TestData>({
      replay: true,
      replayMax: 2
    });

    const prom = emitter.emitAll([
      { foo: "foo" },
      { foo: "bar" },
      { bar: "foo" }
    ]);

    prom.then(() => {
      const passedData: TestData[] = [];

      emitter.subscribe(data => {
        passedData.push(data);
      });

      expect(passedData.length).toEqual(2);
      expect(passedData).toMatchObject([
        { foo: "bar" },
        { bar: "foo" }
      ]);
      done();
    });
  });

  it("emitter.filter()", done => {
    const emitter = new Emitter<TestData>();

    const passedData: TestData[] = [];

    emitter
      .filter(data => data.foo === "bar")
      .subscribe(data => {
        passedData.push(data);
      });

    const prom = emitter.emitAll([
      { foo: "foo" },
      { foo: "bar" },
      { bar: "foo" }
    ]);

    prom.then(() => {
      expect(passedData.length).toEqual(1);
      expect(passedData[0]).toMatchObject({ foo: "bar" });
      done();
    });
  });

  it("emitter.map()", done => {
    const emitter = new Emitter();

    const passedData: TestData[] = [];

    emitter
      .map(data => data.value)
      .subscribe(data => {
        passedData.push(data);
      });

    const prom = emitter.emitAll([
      { value: 4 },
      { value: 8 },
      { value: 15 },
      { value: 16 }
    ]);

    prom.then(() => {
      expect(passedData.length).toEqual(4);
      expect(passedData).toMatchObject([4, 8, 15, 16]);
      done();
    });
  });

  it("emitter.reduce()", done => {
    const emitter = new Emitter<NumberData>();

    let latestData: number;

    emitter
      .reduce<number>((accum, data) => {
        return accum + data.value;
      }, 0)
      .subscribe(data => {
        latestData = data;
      });

    const prom = emitter.emitAll([
      { value: 4 },
      { value: 8 },
      { value: 15 },
      { value: 16 }
    ]);

    prom.then(() => {
      expect(latestData).toEqual(43);
      done();
    });
  });

  it("emitter.delay()", done => {
    const emitter = new Emitter();

    let latestData: number = 0;

    emitter.delay(1000).subscribe(data => {
      latestData = data;
    });

    const prom = emitter.emit(42);

    prom.then(() => {
      expect(latestData).toEqual(0);

      setTimeout(() => {
        expect(latestData).toEqual(42);
        done();
      }, 1100);
    });
  });

  it("emitter.buffer() with Emitter releaser", done => {
    const emitter = new Emitter();
    const releaser = new Emitter();

    let latestData: number[] = null;

    emitter.buffer(releaser).subscribe(data => {
      latestData = data;
    });

    emitter.emit(4);
    emitter.emit(8);
    emitter.emit(15);
    emitter.emit(16);

    expect(latestData).toBeNull();

    releaser.emit();

    expect(latestData).toMatchObject([4, 8, 15, 16]);
    done();
  });

  it("emitter.buffer() with function releaser", done => {
    const emitter = new Emitter<number>();
    const releaser = (buffer: number[], release: ReleaseExecutionFunction): void => {
      if((buffer.includes(16))) {
        release();
      }
    };

    emitter.buffer(releaser).subscribe(data => {
      expect(data).toMatchObject([4, 8, 15, 16]);
      done();
    });

    emitter.emit(4);
    emitter.emit(8);
    emitter.emit(15);
    emitter.emit(16);
  });

  it("emitter.debounce()", done => {
    const emitter = new Emitter();
    const releaser = new Emitter();

    let latestData: number = null;

    emitter.debounce(releaser).subscribe(data => {
      latestData = data;
    });

    emitter.emit(4);
    emitter.emit(8);
    emitter.emit(15);
    emitter.emit(16);

    expect(latestData).toBeNull();

    releaser.emit();

    expect(latestData).toEqual(16);
    done();
  });

  it("emitter.debounce() with timeout releaser", done => {
    const emitter = new Emitter();

    let latestData: number = null;

    emitter.debounce(timeoutReleaser(1000)).subscribe(data => {
      latestData = data;
    });

    emitter.emit(4);
    setTimeout(() => {
      emitter.emit(8);
    }, 100);
    setTimeout(() => {
      emitter.emit(15);
    }, 200);
    setTimeout(() => {
      emitter.emit(16);
    }, 300);

    setTimeout(() => {
      expect(latestData).toBeNull();

      setTimeout(() => {
        expect(latestData).toEqual(16);
        done();
      }, 1000);
    }, 500);
  });

  it("emitter.audit()", done => {
    const emitterA = new Emitter();
    const releaser = new Emitter();

    emitterA.audit(releaser).subscribe(data => {
      expect(data).toMatchObject({ foo: "bar" });
      done();
    });

    emitterA.emit({
      foo: "foo"
    });

    releaser.emit();

    emitterA.emit({
      foo: "bar"
    });
  });

  it("emitter.auditTime()", done => {
    const emitterA = new Emitter();

    emitterA.auditTime(200).subscribe(data => {
      expect(data).toMatchObject({ foo: "bar" });
      done();
    });

    emitterA.emit({
      foo: "foo"
    });

    setTimeout(() => {
      emitterA.emit({
        foo: "bar"
      });
    }, 300);
  });

  it("emitter.thenDispatch()", done => {
    const emitter = new Emitter();
    const $el = document.createElement("div");

    $el.addEventListener("custom", (event: CustomEvent<FooData>) => {
      expect(event.detail).toMatchObject({ foo: "bar" });
      done();
    });

    emitter.thenDispatch("custom", $el);

    emitter.emit({ foo: "bar" });
  });

});

describe("Emitter operators and sources", () => {

  it("merge()", done => {
    const $a = document.createElement("a");
    const $b = document.createElement("a");
    const $c = document.createElement("a");
    const emitterA = fromListener("click", $a).start();
    const emitterB = fromListener("click", $b).start();
    const emitterC = fromListener("click", $c).start();

    const emitterM = merge<Event>(
      emitterA,
      emitterB,
      emitterC
    ).start();

    const results: Event[] = [];

    emitterM.subscribe(data => {
      results.push(data);
    });

    $a.click();
    $c.click();
    $b.click();

    emitterM.stop();

    $a.click();

    setTimeout(() => {
      expect(results).toHaveLength(3);
      expect(results[0]).toBeInstanceOf(Event);
      done();
    }, 100);
  });

  it("Emitter fromInterval() with maxTimes", done => {
    const emitter = fromInterval(0, 100, 5).start();

    const passedData: IntervalData[] = [];

    emitter.subscribe(data => {
      passedData.push(data);
    });

    setTimeout(() => {
      expect(passedData.length).toEqual(5);
      expect(passedData.pop()).toMatchObject({
        times: 5,
        delay: 0,
        interval: 100,
        maxTimes: 5
      });
      done();
    }, 600);
  });

  it("Emitter fromInterval() unlimited", done => {
    const emitter = fromInterval(0, 100).start();

    const passedData: IntervalData[] = [];

    emitter.subscribe(data => {
      passedData.push(data);
      if(data.times === 5) {
        emitter.stop();
      }
    });

    setTimeout(() => {
      expect(passedData.length).toEqual(5);
      expect(passedData.pop()).toMatchObject({
        times: 5,
        delay: 0,
        interval: 100,
        maxTimes: 0
      });
      done();
    }, 600);
  });

  it("Emitter fromPromise()", done => {
    const prom = new Promise<FooData>((ok) => {
      setTimeout(() => ok({ foo: "bar" }), 200);
    });
    const emitter = fromPromise(prom);

    emitter.subscribe(data => {
      expect(data).toMatchObject({ foo: "bar" });
      done();
    });
  });

  it("Emitter fromListener()", done => {
    const $a = document.createElement("a");
    const emitter = fromListener("click", $a).start();

    let result: Event;

    emitter.subscribe(data => {
      result = data;
    });

    $a.click();

    emitter.stop();

    $a.click();

    setTimeout(() => {
      expect(result).toBeInstanceOf(Event);
      done();
    }, 100);
  });

  it("Emitter fromObserver()", done => {
    let value: string = null;
    const emitter = fromObserver(() => value, 80).start();
    const results: string[] = [];

    emitter.subscribe(data => {
      results.push(data);
    });

    setTimeout(() => (value = "foo"), 100);
    setTimeout(() => (value = "bar"), 200);
    setTimeout(() => emitter.stop(), 300);
    setTimeout(() => (value = "test"), 400);
    setTimeout(() => {
      expect(results).toEqual(["foo", "bar"]);
      done();
    }, 500);
  });

  it("Emitter fromStorage()", done => {
    const emitter = fromStorage("testItem", window.localStorage, 80).start();
    const results: string[] = [];

    emitter.subscribe(data => {
      results.push(data);
    });

    setTimeout(() => window.localStorage.setItem("testItem", "foo"), 100);
    setTimeout(() => window.localStorage.setItem("testItem", "bar"), 200);
    setTimeout(() => emitter.stop(), 300);
    setTimeout(() => window.localStorage.setItem("testItem", "test"), 400);
    setTimeout(() => {
      expect(results).toEqual(["foo", "bar"]);
      done();
    }, 500);
  });

  it("Emitter fromObserver() promise", done => {
    let value: string = null;
    const emitter = fromObserver(() => Promise.resolve(value), 80).start();
    const results: string[] = [];

    emitter.subscribe(data => {
      results.push(data);
    });

    setTimeout(() => (value = "foo"), 100);
    setTimeout(() => (value = "bar"), 200);
    setTimeout(() => emitter.stop(), 300);
    setTimeout(() => (value = "test"), 400);
    setTimeout(() => {
      expect(results).toEqual(["foo", "bar"]);
      done();
    }, 500);
  });

  it("Emitter fromCookie()", done => {
    const emitter = fromCookie("testCookie", 80).start();
    const results: string[] = [];

    emitter.subscribe(data => {
      results.push(data);
    });

    setTimeout(() => (document.cookie = "testCookie=foo"), 100);
    setTimeout(() => (document.cookie = "testCookie=bar"), 200);
    setTimeout(() => emitter.stop(), 300);
    setTimeout(() => (document.cookie = "testCookie=test"), 400);
    setTimeout(() => {
      expect(results).toEqual(["foo", "bar"]);
      done();
    }, 500);
  });

  it("Emitter fromSearchParam()", done => {
    const emitter = fromSearchParam("test", 80).start();
    const results: string[] = [];

    emitter.subscribe(data => {
      results.push(data);
    });

    const changeSearch = (search: string): void => {
      delete window.location;
      (window as any).location = {
        search
      };
    };

    setTimeout(() => changeSearch("?test=foo"), 100);
    setTimeout(() => changeSearch("?test=bar"), 200);
    setTimeout(() => emitter.stop(), 300);
    setTimeout(() => changeSearch("?test=test"), 400);
    setTimeout(() => {
      expect(results).toEqual(["foo", "bar"]);
      done();
    }, 500);
  });

  it("Emitter fromWebSocket()", done => {
    const server = new WS("ws://localhost:1234");
    const client = new WebSocket("ws://localhost:1234");

    const emitter = fromWebSocket(client).start();
    const results: string[] = [];

    emitter.subscribe(data => {
      results.push(data);
    });

    setTimeout(() => server.send("foo"), 100);
    setTimeout(() => server.send("bar"), 200);
    setTimeout(() => emitter.stop(), 300);
    setTimeout(() => server.send("test"), 400);
    setTimeout(() => {
      server.close();
      expect(results).toEqual(["foo", "bar"]);
      done();
    }, 500);
  });


  it("Emitter fromFetchPolling()", done => {
    let counter: number = 0;
    (global as any).fetch = jest.fn(() => {
      return Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve(`num=${++counter}`)
      });
    });

    const emitter = fromFetchPolling(100, "http://test/path").start();
    const results: string[] = [];

    emitter.subscribe(async (res: Response) => {
      results.push(await res.text());
    });

    setTimeout(() => {
      emitter.stop();
    }, 500);

    setTimeout(() => {
      expect(results).toEqual(["num=1", "num=2", "num=3", "num=4", "num=5"]);
      done();
    }, 700);
  });

});

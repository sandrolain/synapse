/**
 * @jest-environment jsdom
 */

import { Emitter } from "../index";

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

  it("emitter.thenDispatch()", done => {
    const emitter = new Emitter();
    const $el = document.createElement("div");

    const listener = ((event: CustomEvent<FooData>): void => {
      expect(event.detail).toMatchObject({ foo: "bar" });
      done();
    }) as EventListener;

    $el.addEventListener("custom", listener);

    emitter.thenDispatch("custom", $el);

    emitter.emit({ foo: "bar" });
  });

});

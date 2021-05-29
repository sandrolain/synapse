/**
 * @jest-environment jsdom
 */

import WS from "jest-websocket-mock";
import { IntervalData, fromInterval, fromPromise, fromListener, merge, fromStorage, fromObserver, fromCookie, fromSearchParam, fromWebSocket, fromFetchPolling } from "../initiators";

interface FooData {
  foo: string;
}

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
    const emitter = fromCookie("testCookie", 50).start();
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
    const emitter = fromSearchParam("test", 50).start();
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

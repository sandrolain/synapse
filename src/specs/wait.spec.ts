/**
 * @jest-environment jsdom
 */

import { Emitter } from "../index";
import { timeoutReleaser, emitterReleaser, debounceReleaser, delayReleaser, countReleaser, lengthReleaser } from "../releasers";

describe("emitter.wait()", () => {

  it("emitter.wait() with emitterReleaser()", done => {
    const emitter = new Emitter();
    const releaser = new Emitter();

    let latestData: number = null;

    emitter.wait(emitterReleaser(releaser)).subscribe(data => {
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

  it("emitter.wait() with delayReleaser()", done => {
    const emitter = new Emitter();

    let latestData: number = 0;

    emitter.wait(delayReleaser(500)).subscribe(data => {
      latestData = data;
    });

    const prom = emitter.emit(42);

    prom.then(() => {
      expect(latestData).toEqual(0);

      setTimeout(() => {
        expect(latestData).toEqual(0);
      }, 400);

      setTimeout(() => {
        expect(latestData).toEqual(42);
        done();
      }, 550);
    });
  });

  it("emitter.wait() with debounceReleaser()", done => {
    const emitter = new Emitter();

    let latestData: number = null;

    emitter.wait(debounceReleaser(1000)).subscribe(data => {
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

  it("emitter.wait() with timeoutReleaser()", done => {
    const emitter = new Emitter();

    let latestData: number = 0;

    emitter.wait(timeoutReleaser(500)).subscribe(data => {
      latestData = data;
    });

    const prom = emitter.emit(42);

    prom.then(() => {
      expect(latestData).toEqual(0);

      setTimeout(() => {
        expect(latestData).toEqual(0);
        emitter.emit(84);
      }, 400);

      setTimeout(() => {
        expect(latestData).toEqual(42);
        done();
      }, 550);
    });
  });

  it("emitter.wait() with countReleaser()", done => {
    const emitter = new Emitter();

    const receivedData: number[] = [];

    emitter.wait(countReleaser(3)).subscribe(data => {
      receivedData.push(data);
    });

    emitter.emit(4);
    setTimeout(() => {
      emitter.emit(8);
    }, 100);
    setTimeout(() => {
      expect(receivedData).toEqual([]);
      emitter.emit(15);
    }, 200);
    setTimeout(() => {
      expect(receivedData).toEqual([15]);
      emitter.emit(16);
    }, 300);
    setTimeout(() => {
      expect(receivedData).toEqual([15]);
      done();
    }, 400);
  });

  it("emitter.wait() with lengthReleaser()", done => {
    const emitter = new Emitter<number[]>();

    let receivedData: number[] = null;

    emitter.wait(lengthReleaser(15)).subscribe(data => {
      receivedData = data;
    });

    emitter.emit(Array(4));
    setTimeout(() => {
      expect(receivedData).toBeNull();
      emitter.emit(Array(8));
    }, 100);
    setTimeout(() => {
      expect(receivedData).toBeNull();
      emitter.emit(Array(15));
    }, 200);
    setTimeout(() => {
      expect(receivedData).toHaveLength(15);
      emitter.emit(Array(16));
    }, 300);
    setTimeout(() => {
      expect(receivedData).toHaveLength(15);
      done();
    }, 400);
  });

});

/**
 * @jest-environment jsdom
 */

import { Emitter, IntervalData } from "./index";

type TestData = Record<string, string>;
interface FooData {
  foo: string;
}
interface NumberData {
  value: number;
}

describe("Emitter module", () => {

  it("emit with callback", done => {
    const subject = new Emitter<FooData>();

    subject.subscribe(data => {
      expect(data).toMatchObject({ foo: "bar" });
      done();
    });

    subject.emit({
      foo: "bar"
    });
  });

  it("chain emit with callback", done => {
    const subjectA = new Emitter<FooData>();
    const subjectB = new Emitter<FooData>();

    subjectB.subscribe(data => {
      expect(data).toMatchObject({ foo: "bar" });
      done();
    });

    subjectA.subscribe(subjectB);

    subjectA.emit({
      foo: "bar"
    });
  });

  it("emit with promise", done => {
    const subject = new Emitter<FooData>();

    const prom = subject.promise();

    prom.then(data => {
      expect(data).toMatchObject({ foo: "bar" });
      done();
    });

    subject.emit({
      foo: "bar"
    });
  });

  it("emitAll() with callback", done => {
    const subject = new Emitter<TestData>();

    const passedData: TestData[] = [];

    subject.subscribe(data => {
      passedData.push(data);
    });

    subject.emitAll([
      {
        foo: "foo"
      },
      {
        foo: "bar"
      },
      {
        bar: "foo"
      }
    ]);

    setTimeout(() => {
      expect(passedData.length).toEqual(3);
      expect(passedData).toMatchObject([
        {
          foo: "foo"
        },
        {
          foo: "bar"
        },
        {
          bar: "foo"
        }
      ]);
      done();
    }, 1000);
  });

  it("filter()", done => {
    const subject = new Emitter<TestData>();

    const passedData: TestData[] = [];

    subject
      .filter(data => data.foo === "bar")
      .subscribe(data => {
        passedData.push(data);
      });

    subject.emitAll([
      {
        foo: "foo"
      },
      {
        foo: "bar"
      },
      {
        bar: "foo"
      }
    ]);

    setTimeout(() => {
      expect(passedData.length).toEqual(1);
      expect(passedData[0]).toMatchObject({ foo: "bar" });
      done();
    }, 1000);
  });

  it("map()", done => {
    const subject = new Emitter();

    const passedData: TestData[] = [];

    subject
      .map(data => data.value)
      .subscribe(data => {
        passedData.push(data);
      });

    subject.emitAll([
      {
        value: 4
      },
      {
        value: 8
      },
      {
        value: 15
      },
      {
        value: 16
      }
    ]);

    setTimeout(() => {
      expect(passedData.length).toEqual(4);
      expect(passedData).toMatchObject([4, 8, 15, 16]);
      done();
    }, 1000);
  });

  it("reduce()", done => {
    const subject = new Emitter<NumberData>();

    let latestData: number;

    subject
      .reduce<number>((accum, data) => {
        return accum + data.value;
      }, 0)
      .subscribe(data => {
        latestData = data;
      });

    subject.emitAll([
      {
        value: 4
      },
      {
        value: 8
      },
      {
        value: 15
      },
      {
        value: 16
      }
    ]);

    setTimeout(() => {
      expect(latestData).toEqual(43);
      done();
    }, 1000);
  });

  it("delay()", done => {
    const subject = new Emitter();

    let latestData: number = 0;

    subject.delay(1000).subscribe(data => {
      latestData = data;
    });

    subject.emit(42);

    setTimeout(() => {
      expect(latestData).toEqual(0);

      setTimeout(() => {
        expect(latestData).toEqual(42);
        done();
      }, 1000);
    }, 500);
  });

  it("buffer()", done => {
    const subject = new Emitter();
    const releaser = new Emitter();

    let latestData: number[] = null;

    subject.buffer(releaser).subscribe(data => {
      latestData = data;
    });

    subject.emit(4);
    setTimeout(() => {
      subject.emit(8);
    }, 100);
    setTimeout(() => {
      subject.emit(15);
    }, 200);
    setTimeout(() => {
      subject.emit(16);
    }, 300);

    setTimeout(() => {
      releaser.emit();
    }, 1000);

    setTimeout(() => {
      expect(latestData).toBeNull();

      setTimeout(() => {
        expect(latestData).toMatchObject([4, 8, 15, 16]);
        done();
      }, 1000);
    }, 500);
  });

  it("audit()", done => {
    const subject = new Emitter();
    const releaser = new Emitter();

    let latestData: number = null;

    subject.audit(releaser).subscribe(data => {
      latestData = data;
    });

    subject.emit(4);
    setTimeout(() => {
      subject.emit(8);
    }, 100);
    setTimeout(() => {
      subject.emit(15);
    }, 200);
    setTimeout(() => {
      subject.emit(16);
    }, 300);

    setTimeout(() => {
      releaser.emit();
    }, 1000);

    setTimeout(() => {
      expect(latestData).toBeNull();

      setTimeout(() => {
        expect(latestData).toEqual(16);
        done();
      }, 1000);
    }, 500);
  });

  it("auditTime()", done => {
    const subject = new Emitter();

    let latestData: number = null;

    subject.auditTime(1000).subscribe(data => {
      latestData = data;
    });

    subject.emit(4);
    setTimeout(() => {
      subject.emit(8);
    }, 100);
    setTimeout(() => {
      subject.emit(15);
    }, 200);
    setTimeout(() => {
      subject.emit(16);
    }, 300);

    setTimeout(() => {
      expect(latestData).toBeNull();

      setTimeout(() => {
        expect(latestData).toEqual(16);
        done();
      }, 1000);
    }, 500);
  });

  it("Emitter fromInterval()", done => {
    const subject = Emitter.fromInterval(0, 100, 5);

    const passedData: IntervalData[] = [];

    subject.subscribe(data => {
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

  it("Emitter fromPromise()", done => {
    const prom = new Promise<FooData>((ok) => {
      setTimeout(() => ok({ foo: "bar" }), 200);
    });
    const subject = Emitter.fromPromise(prom);

    subject.subscribe(data => {
      expect(data).toMatchObject({ foo: "bar" });
      done();
    });
  });

  it("Emitter fromListener()", done => {
    const $a = document.createElement("a");
    const subject = Emitter.fromListener($a, "click");

    subject.subscribe(data => {
      expect(data).toBeInstanceOf(Event);
      done();
    });

    $a.click();
  });
});

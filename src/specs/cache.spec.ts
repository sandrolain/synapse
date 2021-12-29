/**
 * @jest-environment jsdom
 */

import { Emitter } from "../index";

describe("emitter.cache()", () => {

  it("emitter.cache() ", done => {
    const emitter = new Emitter<number>();

    let latestData: number[] = null;

    emitter.cache(2).subscribe(data => {
      latestData = data;
    });

    expect(latestData).toBeNull();

    emitter.emit(4);
    expect(latestData).toMatchObject([4]);

    emitter.emit(8);
    expect(latestData).toMatchObject([4, 8]);

    emitter.emit(15);
    expect(latestData).toMatchObject([8, 15]);

    emitter.emit(16);
    expect(latestData).toMatchObject([15, 16]);

    done();
  });

});
